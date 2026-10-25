import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('catalog taxonomy migration is additive, repeatable and preserves legacy sport links', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sql = await readFile(join(root, 'backend/database/migrations/005_product_type_taxonomy.sql'), 'utf8');
  for (const type of ['kimonos', 'cinturones', 'conjuntos-entrenamiento', 'camisas', 'sudaderas', 'medias']) {
    assert.match(sql, new RegExp(`'${type}'`));
  }
  assert.match(sql, /ON CONFLICT \(slug\) DO UPDATE/);
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.match(sql, /old_type\.slug = 'cinturones'[\s\S]+?sport\.slug = 'bjj' AND old_type\.parent_id = sport\.id/);
  assert.doesNotMatch(sql, /DO UPDATE SET[\s\S]{0,180}is_active\s*=/i);
  assert.match(sql, /'judo-gi', 'kimonos'[\s\S]+?'bjj-gi', 'kimonos'[\s\S]+?'rashguard', 'camisas'/);
  assert.doesNotMatch(sql, /\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i);
  assert.match(sql, /\nBEGIN;/);
  assert.match(sql, /COMMIT;\s*$/);
});

test('catalog image migration only replaces the original demo artwork and stays additive', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sql = await readFile(join(root, 'backend/database/migrations/006_catalog_product_images.sql'), 'utf8');
  for (const image of ['judogi-prototipo-fuji.webp', 'judogi-competencia-azul.webp', 'judogi-entrenamiento-blanco.jpg', 'bjj-gi-negro.jpg', 'rashguard-tatami.jpg']) {
    assert.match(sql, new RegExp(image.replace('.', '\\.') + "'"));
  }
  assert.match(sql, /product\.image_url IS NULL OR product\.image_url = mapping\.original_image_url/);
  assert.match(sql, /ALTER TABLE products DROP CONSTRAINT IF EXISTS products_image_url_valid/);
  assert.match(sql, /image_url ~ '\^\/catalog-art\//);
  assert.match(sql, /\('rashguard-tatami', 'bjj', 'camisas'\)/);
  assert.match(sql, /\('cinturon-bjj-azul', 'bjj', 'cinturones'\)/);
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.doesNotMatch(sql, /\b(?:CREATE|DROP)\s+TABLE\b/i);
  assert.match(sql, /\nBEGIN;/);
  assert.match(sql, /COMMIT;\s*$/);
});
