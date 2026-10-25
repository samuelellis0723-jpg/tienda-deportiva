-- Add the shared product-type taxonomy without changing the schema.
-- Preserve the BJJ discipline on existing belts before moving that category.
BEGIN;

INSERT INTO categories (slug, name, description, parent_id, is_active)
VALUES ('uniformes', 'Tipos de producto', 'Clasificacion canonica del catalogo OJE', NULL, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  parent_id = NULL;

INSERT INTO product_categories (product_id, category_id)
SELECT pc.product_id, sport.id
FROM product_categories pc
JOIN categories old_type ON old_type.id = pc.category_id AND old_type.slug = 'cinturones'
JOIN categories sport ON sport.slug = 'bjj' AND old_type.parent_id = sport.id
ON CONFLICT DO NOTHING;

INSERT INTO categories (parent_id, slug, name, description, is_active)
SELECT root.id, types.slug, types.name, 'Tipo de producto OJE; la disciplina se asigna aparte.', true
FROM categories root
CROSS JOIN (VALUES
  ('kimonos', 'Kimonos'),
  ('cinturones', 'Cinturones'),
  ('conjuntos-entrenamiento', 'Conjuntos de entrenamiento'),
  ('camisas', 'Camisas'),
  ('sudaderas', 'Sudaderas / suéteres'),
  ('medias', 'Medias OJE')
) AS types(slug, name)
WHERE root.slug = 'uniformes' AND root.parent_id IS NULL
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO product_categories (product_id, category_id)
SELECT pc.product_id, canonical.id
FROM product_categories pc
JOIN categories legacy ON legacy.id = pc.category_id
JOIN (VALUES
  ('judo-gi', 'kimonos'),
  ('bjj-gi', 'kimonos'),
  ('rashguard', 'camisas')
) AS mapping(legacy_slug, type_slug) ON mapping.legacy_slug = legacy.slug
JOIN categories canonical ON canonical.slug = mapping.type_slug
ON CONFLICT DO NOTHING;

COMMIT;
