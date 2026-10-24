-- Stores a hash of normalized checkout input so an idempotency key cannot be
-- silently reused for a different order payload.
ALTER TABLE orders ADD COLUMN idempotency_fingerprint char(64);
ALTER TABLE orders ADD CONSTRAINT orders_idempotency_fingerprint_format
    CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$');
