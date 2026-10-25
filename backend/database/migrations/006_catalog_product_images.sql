-- Assign the provided local product photos to matching demo catalog items.
-- Preserve any image already customized by an administrator.
BEGIN;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_image_url_valid;
ALTER TABLE products
  ADD CONSTRAINT products_image_url_valid CHECK (
    image_url IS NULL OR (
      char_length(image_url) BETWEEN 1 AND 2048
      AND (
        image_url ~ '^/catalog-art/[a-z0-9]+(-[a-z0-9]+)*[.](svg|webp|png|jpg|jpeg)$'
        OR image_url ~ '^https?://[^[:space:]]+$'
      )
    )
  );

UPDATE products AS product
SET image_url = mapping.image_url
FROM (VALUES
  ('prototipo-judogi', '/catalog-art/judogi-prototipo-fuji.webp', '/catalog-art/kimonos-blanco.svg'),
  ('judogi-competencia-azul', '/catalog-art/judogi-competencia-azul.webp', '/catalog-art/kimonos-azul.svg'),
  ('judogi-entrenamiento-blanco', '/catalog-art/judogi-entrenamiento-blanco.jpg', '/catalog-art/kimonos-blanco.svg'),
  ('bjj-gi-negro', '/catalog-art/bjj-gi-negro.jpg', '/catalog-art/kimonos-negro.svg'),
  ('rashguard-tatami', '/catalog-art/rashguard-tatami.jpg', '/catalog-art/camisas-negra.svg')
) AS mapping(slug, image_url, original_image_url)
WHERE product.slug = mapping.slug
  AND (product.image_url IS NULL OR product.image_url = mapping.original_image_url);

-- Older demo rows may have only a sport link. Restore their known type links.
INSERT INTO product_categories (product_id, category_id)
SELECT product.id, category.id
FROM products AS product
JOIN (VALUES
  ('prototipo-judogi', 'judo', 'kimonos'),
  ('judogi-competencia-azul', 'judo', 'kimonos'),
  ('judogi-entrenamiento-blanco', 'judo', 'kimonos'),
  ('bjj-gi-negro', 'bjj', 'kimonos'),
  ('rashguard-tatami', 'bjj', 'camisas'),
  ('cinturon-bjj-azul', 'bjj', 'cinturones')
) AS mapping(product_slug, sport_slug, type_slug) ON mapping.product_slug = product.slug
JOIN categories AS category ON category.slug IN (mapping.sport_slug, mapping.type_slug)
ON CONFLICT DO NOTHING;

COMMIT;
