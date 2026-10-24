-- Add an optional product image URL without rewriting prior migrations.
ALTER TABLE products
  ADD COLUMN image_url text,
  ADD CONSTRAINT products_image_url_valid CHECK (
    image_url IS NULL OR (
      char_length(image_url) BETWEEN 1 AND 2048
      AND image_url ~ '^https?://[^[:space:]]+$'
    )
  );
