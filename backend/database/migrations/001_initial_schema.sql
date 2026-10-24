-- OJE migration 001: relational commerce foundation
-- PostgreSQL 14+

CREATE TABLE app_settings (
    setting_key text PRIMARY KEY,
    setting_value jsonb NOT NULL,
    description text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE user_roles (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id bigint NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id bigint REFERENCES categories(id) ON DELETE RESTRICT,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_slug_nonempty CHECK (length(trim(slug)) > 0),
    CONSTRAINT categories_name_nonempty CHECK (length(trim(name)) > 0),
    CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX categories_parent_idx ON categories(parent_id);

CREATE TABLE products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'publicado')),
    price numeric(12,2) NOT NULL CHECK (price > 0),
    currency char(3) NOT NULL DEFAULT 'CRC' CHECK (currency ~ '^[A-Z]{3}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    CONSTRAINT products_sku_nonempty CHECK (length(trim(sku)) > 0),
    CONSTRAINT products_slug_nonempty CHECK (length(trim(slug)) > 0),
    CONSTRAINT products_name_nonempty CHECK (length(trim(name)) > 0),
    CONSTRAINT products_publish_timestamp CHECK ((status = 'borrador' AND published_at IS NULL) OR (status = 'publicado' AND published_at IS NOT NULL))
);
CREATE INDEX products_public_catalog_idx ON products(status, created_at DESC) WHERE status = 'publicado';
CREATE INDEX products_name_search_idx ON products USING gin (to_tsvector('spanish', name));

CREATE TABLE product_categories (
    product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id bigint NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    PRIMARY KEY (product_id, category_id)
);
CREATE INDEX product_categories_category_idx ON product_categories(category_id, product_id);

CREATE TABLE product_variants (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku text NOT NULL UNIQUE,
    size text NOT NULL,
    color text NOT NULL DEFAULT 'Único',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_variants_option_unique UNIQUE (product_id, size, color),
    CONSTRAINT product_variants_sku_nonempty CHECK (length(trim(sku)) > 0),
    CONSTRAINT product_variants_size_nonempty CHECK (length(trim(size)) > 0)
);
CREATE INDEX product_variants_product_idx ON product_variants(product_id);

CREATE TABLE inventory (
    variant_id bigint PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
    on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
    reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT inventory_reserved_not_over_stock CHECK (reserved <= on_hand)
);

CREATE TABLE collections (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'publicado')),
    is_featured boolean NOT NULL DEFAULT false,
    starts_at timestamptz,
    ends_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT collection_dates_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CONSTRAINT featured_collection_published CHECK (NOT is_featured OR status = 'publicado')
);
CREATE INDEX featured_collections_idx ON collections(is_featured, starts_at, ends_at) WHERE status = 'publicado' AND is_featured;

CREATE TABLE collection_products (
    collection_id bigint NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
    PRIMARY KEY (collection_id, product_id),
    UNIQUE (collection_id, position)
);

CREATE TABLE cities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    province text NOT NULL,
    shipping_cost numeric(12,2) NOT NULL CHECK (shipping_cost >= 0),
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT cities_name_province_unique UNIQUE (name, province)
);

CREATE TABLE customers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customers_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT customers_email_unique UNIQUE (email),
    CONSTRAINT customers_names_nonempty CHECK (length(trim(first_name)) > 0 AND length(trim(last_name)) > 0)
);

CREATE TABLE addresses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id bigint NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    city_id bigint NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    address_line text NOT NULL,
    postal_code text,
    recipient_name text NOT NULL,
    phone text,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT addresses_line_nonempty CHECK (length(trim(address_line)) > 0)
);
CREATE UNIQUE INDEX addresses_one_default_per_customer ON addresses(customer_id) WHERE is_default;
CREATE INDEX addresses_customer_idx ON addresses(customer_id);

CREATE TABLE carts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id bigint REFERENCES customers(id) ON DELETE CASCADE,
    session_token_hash text UNIQUE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    currency char(3) NOT NULL DEFAULT 'CRC' CHECK (currency ~ '^[A-Z]{3}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT carts_owner_required CHECK (customer_id IS NOT NULL OR session_token_hash IS NOT NULL)
);
CREATE INDEX carts_customer_idx ON carts(customer_id, updated_at DESC) WHERE status='active';

CREATE TABLE cart_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id bigint NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id bigint NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cart_item_variant_once UNIQUE (cart_id, variant_id)
);
CREATE TABLE coupons (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
    discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
    starts_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
    per_customer_limit integer NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
    minimum_subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT coupons_code_uppercase CHECK (code = upper(trim(code)) AND length(code) > 0),
    CONSTRAINT coupons_dates_valid CHECK (expires_at > starts_at),
    CONSTRAINT coupons_percent_max CHECK (discount_type <> 'percent' OR discount_value <= 100)
);
CREATE INDEX coupons_active_window_idx ON coupons(is_active, starts_at, expires_at);

CREATE TABLE orders (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    order_number text NOT NULL UNIQUE,
    customer_id bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    currency char(3) NOT NULL DEFAULT 'CRC' CHECK (currency ~ '^[A-Z]{3}$'),
    subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    shipping_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
    tax_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
    total numeric(12,2) NOT NULL CHECK (total >= 0),
    coupon_id bigint REFERENCES coupons(id) ON DELETE RESTRICT,
    shipping_city_name text NOT NULL,
    shipping_province text NOT NULL,
    shipping_address_line text NOT NULL,
    shipping_cost_snapshot numeric(12,2) NOT NULL CHECK (shipping_cost_snapshot >= 0),
    idempotency_key text UNIQUE,
    placed_at timestamptz NOT NULL DEFAULT now(),
    shipped_at timestamptz,
    cancelled_at timestamptz,
    CONSTRAINT orders_totals_consistent CHECK (total = subtotal - discount_total + shipping_total + tax_total),
    CONSTRAINT orders_discount_not_over_subtotal CHECK (discount_total <= subtotal),
    CONSTRAINT orders_redemption_identity UNIQUE (id, customer_id, coupon_id),
    CONSTRAINT orders_status_timestamps CHECK ((status NOT IN ('shipped', 'delivered') OR shipped_at IS NOT NULL) AND (status <> 'cancelled' OR cancelled_at IS NOT NULL))
);
CREATE INDEX orders_customer_recent_idx ON orders(customer_id, placed_at DESC);
CREATE INDEX orders_status_recent_idx ON orders(status, placed_at DESC);
CREATE INDEX orders_recent_sales_idx ON orders(placed_at DESC) WHERE status IN ('paid', 'processing', 'shipped', 'delivered');

CREATE TABLE order_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    variant_id bigint NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name_snapshot text NOT NULL,
    sku_snapshot text NOT NULL,
    variant_snapshot text NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
    line_total numeric(12,2) NOT NULL CHECK (line_total = unit_price * quantity),
    CONSTRAINT order_items_variant_once UNIQUE (order_id, variant_id)
);
CREATE INDEX order_items_order_idx ON order_items(order_id);
CREATE INDEX order_items_variant_idx ON order_items(variant_id);

CREATE TABLE payments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider text NOT NULL,
    provider_reference text UNIQUE,
    status text NOT NULL CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments(order_id, created_at DESC);

CREATE TABLE shipments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    carrier text NOT NULL,
    tracking_number text UNIQUE,
    status text NOT NULL CHECK (status IN ('pending', 'shipped', 'in_transit', 'delivered', 'exception')),
    shipped_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT shipment_dates_valid CHECK (delivered_at IS NULL OR (shipped_at IS NOT NULL AND delivered_at >= shipped_at))
);
CREATE TABLE coupon_redemptions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coupon_id bigint NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    customer_id bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_id bigint NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'redeemed' CHECK (status IN ('redeemed', 'reversed')),
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    reversed_at timestamptz,
    CONSTRAINT coupon_redemption_reversal_consistent CHECK ((status = 'redeemed' AND reversed_at IS NULL) OR (status = 'reversed' AND reversed_at IS NOT NULL)),
    CONSTRAINT coupon_redemption_matches_order FOREIGN KEY (order_id, customer_id, coupon_id) REFERENCES orders(id, customer_id, coupon_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX coupon_one_active_redemption_per_customer ON coupon_redemptions(coupon_id, customer_id) WHERE status = 'redeemed';
CREATE INDEX coupon_redemptions_usage_idx ON coupon_redemptions(coupon_id, status, redeemed_at);

CREATE TABLE order_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    from_status text CHECK (from_status IS NULL OR from_status IN ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    to_status text NOT NULL CHECK (to_status IN ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT order_events_seed_idempotency UNIQUE (order_id, to_status, created_at)
);
CREATE INDEX order_events_order_date_idx ON order_events(order_id, created_at DESC);

CREATE TABLE audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_resource_idx ON audit_log(resource_type, resource_id, created_at DESC);

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('free_shipping_threshold_crc', '{"amount": 35000, "currency": "CRC"}', 'Subtotal elegible posterior a descuento y previo a impuesto/envío que habilita envío gratis.'),
('coupon_restore_on_cancel', '{"enabled": true, "only_before_shipment": true, "only_if_coupon_current": true}', 'Condiciones configurables para revertir el uso limitado de cupón al cancelar antes del envío.')
ON CONFLICT (setting_key) DO NOTHING;




