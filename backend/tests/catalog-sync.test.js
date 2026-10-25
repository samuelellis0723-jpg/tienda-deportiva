import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';
import { salesWindowCte, availableStockSql, lowStockThresholdSql, replenishmentPredicateSql, stockStatusSql } from '../src/models/stockPolicy.js';
import { getReplenishmentAlerts } from '../src/models/metricsModel.js';
import { setProductPublished } from '../src/models/productModel.js';
import * as productService from '../src/services/productService.js';

test('catalog reads stay public with an admin cookie, explicit admin reads are protected and stock filters share the alert policy', async (t) => {
  process.env.NODE_ENV = 'test';
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const queries = [];
  const mockCategories = [
    { id: '1', parentId: null, slug: 'judo', name: 'Judo', isActive: true },
    { id: '2', parentId: null, slug: 'bjj', name: 'BJJ', isActive: true },
    { id: '5', parentId: '1', slug: 'judo-gi', name: 'Judogi', isActive: true },
    { id: '6', parentId: '2', slug: 'bjj-gi', name: 'BJJ Gi', isActive: true },
    { id: '3', parentId: null, slug: 'uniformes', name: 'Tipos de producto', isActive: true },
    { id: '7', parentId: '3', slug: 'kimonos', name: 'Kimonos', isActive: true },
    { id: '8', parentId: '3', slug: 'cinturones', name: 'Cinturones', isActive: true },
    { id: '9', parentId: '3', slug: 'conjuntos-entrenamiento', name: 'Conjuntos de entrenamiento', isActive: true },
    { id: '10', parentId: '3', slug: 'camisas', name: 'Camisas', isActive: true },
    { id: '11', parentId: '3', slug: 'sudaderas', name: 'Sudaderas', isActive: true },
    { id: '12', parentId: '3', slug: 'medias', name: 'Medias OJE', isActive: true },
  ];
  const dates = { createdAt: '2026-10-01T00:00:00.000Z', publishedAt: '2026-10-24T00:00:00.000Z', updatedAt: '2026-10-24T01:00:00.000Z' };
  pool.query = async (sql, values = []) => {
    queries.push({ sql, values });
    if (sql.includes('FROM auth_sessions s')) return { rows: [{ id: 1, email: 'admin@example.test', expiresAt: new Date(Date.now() + 60000) }] };
    if (sql.includes("root.slug='uniformes'")) return { rows: mockCategories.filter((item) => item.parentId === '3').map(({ id, slug, name }) => ({ id, slug, name, productCount: 3 })) };
    if (sql.includes('SELECT c.id, c.parent_id AS "parentId"') && sql.includes('FROM categories c')) return { rows: mockCategories };
    if (sql.includes('FROM stock')) return { rows: [] };
    if (sql.includes('count(*)::int AS total')) return { rows: [{ total: 3 }] };
    const adminProjection = sql.includes("'stock', COALESCE(i.on_hand, 0)");
    const detail = sql.includes('WHERE p.id=$1');
    const draft = detail && Number(values[0]) === 2;
    if (draft && sql.includes("AND p.status='publicado'")) return { rows: [] };
    return { rows: [{ id: draft ? 2 : 1, estado: draft ? 'borrador' : 'publicado', ...dates, variantes: [
      { id: 11, availableStock: 2, lowStockThreshold: 3, stockStatus: 'low', ...(adminProjection ? { stock: 7, isActive: true } : {}) },
    ] }] };
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    pool.connect = originalConnect;
    await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}/api/productos`;
  const headers = { Cookie: 'oje_admin_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
  const typesResponse = await fetch(`${base}/tipos`);
  assert.equal(typesResponse.status, 200);
  const types = (await typesResponse.json()).data;
  assert.deepEqual(types.map(({ slug }) => slug), ['kimonos', 'cinturones', 'conjuntos-entrenamiento', 'camisas', 'sudaderas', 'medias']);
  const publicTypeSql = queries.at(-1).sql;
  assert.match(publicTypeSql, /p\.status='publicado'/);
  assert.match(publicTypeSql, /COUNT\(DISTINCT p\.id\)/);
  assert.doesNotMatch(publicTypeSql, /on_hand|reserved/);

  for (const type of types) {
    const start = queries.length;
    const response = await fetch(`${base}?tipo=${type.slug}`, { headers });
    assert.equal(response.status, 200, `${type.slug} filter should be accepted`);
    const filterQueries = queries.slice(start).filter(({ sql }) => sql.includes('type_tree'));
    assert.equal(filterQueries.length, 2, `${type.slug} should constrain both rows and total`);
    for (const item of filterQueries) {
      assert.ok(item.values.includes(type.id), `${type.slug} should bind its category id`);
      assert.match(item.sql, /p\.status\s*=\s*'publicado'/);
    }
  }

  for (const requestHeaders of [undefined, headers]) {
    for (const suffix of ['', '/1']) {
      const response = await fetch(`${base}${suffix}`, { headers: requestHeaders });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json();
      const product = suffix ? body.data : body.data[0];
      assert.deepEqual(product.createdAt, dates.createdAt);
      assert.deepEqual(product.publishedAt, dates.publishedAt);
      assert.deepEqual(product.updatedAt, dates.updatedAt);
      assert.equal(product.variantes[0].stock, undefined);
      assert.equal(product.variantes[0].isActive, undefined);
      assert.equal(product.variantes[0].stockStatus, 'low');
      const publicSql = queries.at(-1).sql.includes('count(*)') ? queries.at(-2).sql : queries.at(-1).sql;
      assert.ok(!publicSql.includes("'stock',"));
      assert.ok(!publicSql.includes("'isActive',"));
      assert.match(publicSql, /p.status\s*=\s*'publicado'/);
      assert.match(publicSql, /AND v.is_active=true/);
      assert.match(publicSql, /AND c.is_active=true/);
    }
    assert.equal((await fetch(`${base}/2`, { headers: requestHeaders })).status, 404);
  }
  assert.equal(queries.filter(({ sql }) => sql.includes('FROM auth_sessions s')).length, 0, 'public endpoints must not depend on an admin session');
  for (const suffix of ['?estado=borrador', '?stockBajo=true', '/2?vista=admin']) {
    const response = await fetch(`${base}${suffix}`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const draftResponse = await fetch(`${base}/2?vista=admin`, { headers });
  assert.equal(draftResponse.status, 200);
  const draft = (await draftResponse.json()).data;
  assert.equal(draft.estado, 'borrador');
  assert.equal(draft.variantes[0].stock, 7);
  const adminList = await fetch(`${base}?estado=publicado&stockBajo=true&page=2&limit=1`, { headers });
  assert.equal(adminList.status, 200);
  const adminBody = await adminList.json();
  assert.deepEqual(adminBody.meta, { page: 2, limit: 1, total: 3 });
  assert.equal(adminBody.data[0].variantes[0].stock, 7);
  const countQuery = queries.at(-1);
  const listingQuery = queries.at(-2);
  const filter = replenishmentPredicateSql(availableStockSql(), lowStockThresholdSql());
  for (const { sql } of [countQuery, listingQuery]) {
    assert.ok(sql.includes(salesWindowCte));
    assert.ok(sql.includes(filter), 'count and listing must include zero stock and low coverage');
    assert.ok(sql.includes("p.status='publicado' AND EXISTS"));
  }
  assert.deepEqual(countQuery.values, ['publicado']);
  assert.deepEqual(listingQuery.values, ['publicado', 1, 1]);
  assert.match(listingQuery.sql, /ORDER BY COALESCE\(p.published_at,p.created_at\) DESC, p.id ASC/);
  assert.ok(listingQuery.sql.includes(stockStatusSql(availableStockSql(), lowStockThresholdSql())));
  assert.equal((await fetch(`${base}?estado=publicado&stockBajo=maybe`, { headers })).status, 400);
  const adminCategoryResponse = await fetch(`${base}?estado=publicado&categoria=judo-gi`, { headers });
  assert.equal(adminCategoryResponse.status, 200);
  const adminCategoryQueries = queries.slice(-2);
  assert.deepEqual(adminCategoryQueries[0].values, ['publicado', '5', 20, 0]);
  assert.match(adminCategoryQueries[0].sql, /pc\.product_id=p\.id AND c\.id=\$2\s*\)/);
  assert.equal((await fetch(`${base}?deporte=karate`)).status, 400);
  assert.equal((await fetch(`${base}?tipo=inexistente`)).status, 400);
  assert.equal((await fetch(`${base}?deporte=judo&tipo=bjj-gi`)).status, 400, 'a product type must belong to the selected sport');
  const facetResponse = await fetch(`${base}?deporte=judo&tipo=kimonos&categoria=judo`);
  assert.equal(facetResponse.status, 200);
  const facetQueries = queries.slice(-2);
  for (const item of facetQueries) {
    assert.match(item.sql, /WITH RECURSIVE sport_tree/);
    assert.match(item.sql, /WITH RECURSIVE type_tree/);
    assert.match(item.sql, /EXISTS \(/);
  }
  assert.deepEqual(facetQueries[0].values, ['1', '1', '7', 20, 0]);
  assert.deepEqual(facetQueries[1].values, ['1', '1', '7']);
  await assert.rejects(productService.create({ sku: 'NEW-1', slug: 'new-1', name: 'Nuevo', price: 1000, categoryIds: [], variants: [] }), /Asigna el producto a Judo, BJJ o ambos/);
  await fetch(`${base}?ordenar=created_at`);
  assert.match(queries.at(-2).sql, /ORDER BY p.created_at DESC, p.id ASC/);
  await getReplenishmentAlerts();
  const alertSql = queries.at(-1).sql;
  assert.ok(alertSql.includes(salesWindowCte));
  assert.ok(alertSql.includes(availableStockSql()));
  assert.ok(alertSql.includes(replenishmentPredicateSql('available_stock', 'units_sold_7_days')));

  const writes = [];
  let status = 'publicado';
  pool.connect = async () => ({
    async query(sql, values = []) {
      if (sql.includes('SELECT id, status')) return { rows: [{ id: 1, status }], rowCount: 1 };
      if (sql.includes('AS publishable')) return { rows: [{ publishable: true }], rowCount: 1 };
      if (sql.startsWith('UPDATE products SET status')) { writes.push({ sql, values }); status = values[1]; }
      return { rows: [], rowCount: 1 };
    }, release() {},
  });
  assert.equal(await setProductPublished(1, true), 1);
  assert.equal(writes.length, 0, 'repeating publish preserves publishedAt and updatedAt');
  await setProductPublished(1, false);
  assert.equal(writes[0].values[2], null, 'unpublishing clears the date required by the existing constraint');
  await setProductPublished(1, true);
  assert.ok(writes[1].values[2] instanceof Date, 'republication starts a fresh publication date');
});
