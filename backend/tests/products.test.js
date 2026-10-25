import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';
import * as productService from '../src/services/productService.js';

test('product image URL is included in public responses, editable, clearable and rejects invalid schemes', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'https://oje.example.test';
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const seenSql = [];
  const taxonomy = [
    { id: '1', parentId: null, slug: 'judo', name: 'Judo', isActive: true },
    { id: '5', parentId: '1', slug: 'judo-gi', name: 'Judogi', isActive: true },
    { id: '2', parentId: null, slug: 'bjj', name: 'BJJ', isActive: true },
    { id: '6', parentId: '2', slug: 'bjj-gi', name: 'BJJ Gi', isActive: true },
    { id: '3', parentId: null, slug: 'uniformes', name: 'Tipos de producto', isActive: true },
    { id: '7', parentId: '3', slug: 'kimonos', name: 'Kimonos', isActive: true },
  ];
  const rows = [
    { id: 21, sku: 'OJE-IMAGE', slug: 'gi-con-imagen', name: 'Gi con imagen', description: null, imageUrl: 'https://oje.example.test/catalog-art/gi.webp', estado: 'publicado', precio: '42000.00', moneda: 'CRC', categorias: [], variantes: [] },
    { id: 22, sku: 'OJE-NO-IMAGE', slug: 'cinturon-sin-imagen', name: 'Cinturón sin imagen', description: null, imageUrl: null, estado: 'publicado', precio: '9500.00', moneda: 'CRC', categorias: [], variantes: [] },
  ];
  let editedImageUrl = rows[0].imageUrl;
  let createdImageUrl = null;
  pool.query = async (sql, values = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim(); seenSql.push(normalized);
    if (normalized.includes('SELECT c.id, c.parent_id AS "parentId"') && normalized.includes('FROM categories c')) return { rows: taxonomy, rowCount: taxonomy.length };
    if (/SELECT count\(\*\)::int AS total FROM products/.test(normalized)) return { rows: [{ total: rows.length }], rowCount: 1 };
    if (normalized.includes('p.image_url AS "imageUrl"')) {
      if (normalized.includes('WHERE p.id=$1') && Number(values[0]) === 23) return { rows: [{ id: 23, sku: 'OJE-CREATED', slug: 'created-image', name: 'Producto con imagen', description: null, imageUrl: createdImageUrl, estado: 'borrador', precio: '1000.00', moneda: 'CRC', categorias: [], variantes: [] }], rowCount: 1 };
      return { rows: normalized.includes('WHERE p.id=$1') ? [{ ...rows[0], imageUrl: editedImageUrl }] : rows, rowCount: normalized.includes('WHERE p.id=$1') ? 1 : rows.length };
    }
    throw new Error(`Unexpected product test SQL: ${normalized}`);
  };
  pool.connect = async () => ({
    query: async (sql, values = []) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [], rowCount: 0 };
      if (normalized === 'SELECT id FROM categories WHERE id = ANY($1::bigint[]) AND is_active=true') return { rows: [{ id: 1 }, { id: 7 }], rowCount: 2 };
      if (/INSERT INTO products \(sku,slug,name,description,image_url,price,currency\)/.test(normalized)) { createdImageUrl = values[4]; return { rows: [{ id: 23 }], rowCount: 1 }; }
      if (normalized === 'DELETE FROM product_categories WHERE product_id=$1') return { rows: [], rowCount: 0 };
      if (normalized === 'INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)') return { rows: [], rowCount: 1 };
      if (normalized === 'SELECT id, sku FROM product_variants WHERE product_id=$1 FOR UPDATE') return { rows: [], rowCount: 0 };
      if (normalized === 'SELECT id FROM products WHERE id=$1 FOR UPDATE') return { rows: [{ id: values[0] }], rowCount: 1 };
      if (normalized.startsWith('UPDATE products SET sku=$2')) { editedImageUrl = values[5]; return { rows: [], rowCount: 1 }; }
      if (normalized === 'SELECT status FROM products WHERE id=$1') return { rows: [{ status: 'borrador' }], rowCount: 1 };
      throw new Error(`Unexpected product transaction SQL: ${normalized}`);
    }, release() {},
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery; pool.connect = originalConnect; await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const listing = await fetch(`${base}/api/productos`);
  assert.equal(listing.status, 200);
  const listed = (await listing.json()).data;
  assert.equal(listed[0].imageUrl, 'https://oje.example.test/catalog-art/gi.webp');
  assert.equal(listed[1].imageUrl, null);
  const detail = await fetch(`${base}/api/productos/21`);
  assert.equal((await detail.json()).data.imageUrl, 'https://oje.example.test/catalog-art/gi.webp');
  assert.ok(seenSql.filter((sql) => sql.includes('SELECT p.id')).every((sql) => sql.includes('p.image_url AS "imageUrl"')));

  const edited = await productService.update(21, { imageUrl: 'https://oje.example.test/catalog-art/gi-v2.webp' });
  assert.equal(edited.imageUrl, 'https://oje.example.test/catalog-art/gi-v2.webp');
  const cleared = await productService.update(21, { imageUrl: null });
  assert.equal(cleared.imageUrl, null);
  const created = await productService.create({ sku: 'OJE-CREATED', slug: 'created-image', name: 'Producto con imagen', price: 1000, imageUrl: '/catalog-art/kimonos.svg', categoryIds: [1,7], variants: [] });
  assert.equal(created.imageUrl, '/catalog-art/kimonos.svg');
  await assert.rejects(() => productService.update(21, { imageUrl: '/external/image.webp' }), (error) => error.status === 400);
  await assert.rejects(() => productService.update(21, { imageUrl: 'https://cdn.example.test/gi.webp' }), (error) => error.status === 400);
  await assert.rejects(() => productService.create({ sku: 'OJE-BAD', slug: 'bad-image', name: 'Bad', price: 1000, imageUrl: 'data:image/png;base64,AAAA', variants: [] }), (error) => error.status === 400);
  await assert.rejects(() => productService.update(21, { imageUrl: 'javascript:alert(1)' }), (error) => error.status === 400);
});
