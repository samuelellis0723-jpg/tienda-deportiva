import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = ['kimonos', 'cinturones', 'conjuntos-entrenamiento', 'camisas', 'sudaderas', 'medias'];

test('demo seed covers every product type with local artwork, variants and inventory rows', async () => {
  const seed = await readFile(join(root, 'backend/database/seeds/001_demo_data.sql'), 'utf8');
  const publicDir = join(root, 'frontend/public');
  for (const type of types) assert.match(seed, new RegExp(`\\('${type}',`), `${type} category should be seeded`);

  const productsSql = seed.split('INSERT INTO products (')[1].split('ON CONFLICT (sku)')[0];
  const productRows = [...productsSql.matchAll(/\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '(?:publicado|borrador)'/g)];
  assert.ok(productRows.length >= 12, 'each catalog group should have multiple demo product rows');
  const imageByProduct = new Map();
  for (const [, , slug, , description, imagePath] of productRows) {
    assert.match(description, /DEMOSTRACION OJE/);
    assert.match(imagePath, /^\/catalog-art\/[a-z0-9-]+\.(?:svg|webp|jpe?g|png)$/);
    imageByProduct.set(slug, imagePath);
    await readFile(join(publicDir, imagePath.slice(1)));
  }
  for (const [slug, image] of [
    ['prototipo-judogi', 'judogi-prototipo-fuji.webp'],
    ['judogi-competencia-azul', 'judogi-competencia-azul.webp'],
    ['judogi-entrenamiento-blanco', 'judogi-entrenamiento-blanco.jpg'],
    ['bjj-gi-negro', 'bjj-gi-negro.jpg'],
    ['rashguard-tatami', 'rashguard-tatami.jpg'],
  ]) assert.match(imageByProduct.get(slug), new RegExp(`${image.replace('.', '\\.')}$`));

  const categorySql = seed.split('INSERT INTO product_categories (')[1].split(') AS x(product_slug,category_slug)')[0];
  const mappings = [...categorySql.matchAll(/\('([^']+)','([^']+)'\)/g)].map(([, product, category]) => [product, category]);
  const variantSql = seed.split('INSERT INTO product_variants (')[1].split(') AS v(product_slug,sku,size,color)')[0];
  const variantRows = [...variantSql.matchAll(/\('([^']+)','([^']+)','([^']+)','([^']+)'\)/g)].map(([, product, sku]) => [product, sku]);
  const inventorySql = seed.split('INSERT INTO inventory (')[1].split(') AS d(sku,on_hand)')[0];
  const inventorySkus = new Set([...inventorySql.matchAll(/\('([^']+)',\d+\)/g)].map(([, sku]) => sku));

  for (const type of types) {
    const products = new Set(mappings.filter(([, category]) => category === type).map(([product]) => product));
    assert.ok(products.size >= 2, `${type} should have at least two demo products`);
    for (const product of products) {
      assert.ok(imageByProduct.has(product), `${product} should have a seed image`);
      const variants = variantRows.filter(([slug]) => slug === product);
      assert.ok(variants.length > 0, `${product} should have variants`);
      for (const [, sku] of variants) assert.ok(inventorySkus.has(sku), `${sku} should have an inventory row`);
    }
  }
});
