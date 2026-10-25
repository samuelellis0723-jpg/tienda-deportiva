-- Repeatable local/demo data. Uses relative dates so recent-sales metrics remain testable.
INSERT INTO roles (code, name) VALUES ('admin', 'Administrador'), ('operator', 'Operador')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO cities (name, province, shipping_cost) VALUES
('San José', 'San José', 1800), ('Heredia', 'Heredia', 2200),
('Cartago', 'Cartago', 2500), ('Liberia', 'Guanacaste', 4200),
('Limón', 'Limón', 3900), ('Puntarenas', 'Puntarenas', 4000)
ON CONFLICT (name, province) DO UPDATE SET shipping_cost = EXCLUDED.shipping_cost, is_active = true;

INSERT INTO categories (slug, name, description) VALUES
('judo', 'Judo', 'Uniformes y equipo para Judo'),
('bjj', 'BJJ', 'Uniformes y equipo para Brazilian Jiu-Jitsu'),
('uniformes', 'Tipos de producto', 'Clasificacion canonica del catalogo OJE'),
('proteccion', 'Proteccion', 'Protecciones para entrenamiento')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;

INSERT INTO categories (parent_id, slug, name, description)
SELECT c.id, 'judo-gi', 'Judogi', 'Clasificacion historica de kimono de Judo' FROM categories c WHERE c.slug = 'judo'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (parent_id, slug, name, description)
SELECT c.id, 'bjj-gi', 'BJJ Gi', 'Clasificacion historica de kimono de BJJ' FROM categories c WHERE c.slug = 'bjj'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (parent_id, slug, name, description)
SELECT c.id, 'rashguard', 'Rashguard', 'Clasificacion historica de camisa deportiva' FROM categories c WHERE c.slug = 'bjj'
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;
INSERT INTO categories (parent_id, slug, name, description)
SELECT c.id, 'cinturones', 'Cinturones', 'Clasificacion historica de cinturones BJJ' FROM categories c WHERE c.slug = 'bjj'
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;
INSERT INTO categories (parent_id, slug, name, description)
SELECT root.id, types.slug, types.name, 'Tipo de producto OJE; la disciplina se asigna aparte.'
FROM categories root CROSS JOIN (VALUES
  ('kimonos','Kimonos'),('cinturones','Cinturones'),('conjuntos-entrenamiento','Conjuntos de entrenamiento'),
  ('camisas','Camisas'),('sudaderas','Sudaderas / suéteres'),('medias','Medias OJE')
) AS types(slug,name)
WHERE root.slug='uniformes'
ON CONFLICT (slug) DO UPDATE SET parent_id=EXCLUDED.parent_id,name=EXCLUDED.name,description=EXCLUDED.description,is_active=true;

INSERT INTO products (sku, slug, name, description, image_url, status, price, published_at) VALUES
('OJE-JD-001', 'judogi-competencia-azul', 'Judogi Competencia Azul', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/judogi-competencia-azul.webp', 'publicado', 42000, now()),
('OJE-JD-002', 'judogi-entrenamiento-blanco', 'Judogi Entrenamiento Blanco', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/judogi-entrenamiento-blanco.jpg', 'publicado', 31500, now()),
('OJE-BJ-001', 'bjj-gi-negro', 'BJJ Gi Negro', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/bjj-gi-negro.jpg', 'publicado', 48500, now()),
('OJE-BJ-002', 'rashguard-tatami', 'Rashguard Tatami', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/rashguard-tatami.jpg', 'publicado', 18500, now()),
('OJE-PR-001', 'cinturon-bjj-azul', 'Cinturon BJJ Azul', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/cinturones-azul.svg', 'publicado', 9500, now()),
('OJE-DRAFT-001', 'prototipo-judogi', 'Prototipo Judogi', 'DEMOSTRACION OJE: borrador de prueba; no representa oferta comercial.', '/catalog-art/judogi-prototipo-fuji.webp', 'borrador', 29900, NULL),
('OJE-PR-002', 'cinturon-bjj-morado', 'Cinturon BJJ Morado', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/cinturones-morado.svg', 'publicado', 9500, now()),
('OJE-SET-001', 'conjunto-entrenamiento-verde', 'Conjunto de entrenamiento verde', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/conjuntos-entrenamiento.svg', 'publicado', 24000, now()),
('OJE-SET-002', 'conjunto-entrenamiento-negro', 'Conjunto de entrenamiento negro', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/conjuntos-entrenamiento-negro.svg', 'publicado', 24000, now()),
('OJE-TEE-001', 'camisa-entrenamiento-blanca', 'Camisa de entrenamiento blanca', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/camisas.svg', 'publicado', 12000, now()),
('OJE-TEE-002', 'camisa-entrenamiento-negra', 'Camisa de entrenamiento negra', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/camisas-negra.svg', 'publicado', 12000, now()),
('OJE-HOOD-001', 'sudadera-oje-verde', 'Sudadera OJE verde', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/sudaderas.svg', 'publicado', 28000, now()),
('OJE-HOOD-002', 'sudadera-oje-gris', 'Sudadera OJE gris', 'DEMOSTRACION OJE: producto de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/sudaderas-gris.svg', 'publicado', 28000, now()),
('OJE-SOCK-001', 'medias-oje-blancas', 'Medias OJE blancas', 'DEMOSTRACION OJE: articulo de marca de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/medias.svg', 'publicado', 6500, now()),
('OJE-SOCK-002', 'medias-oje-verdes', 'Medias OJE verdes', 'DEMOSTRACION OJE: articulo de marca de prueba; confirmar detalles comerciales antes de vender.', '/catalog-art/medias-verde.svg', 'publicado', 6500, now())
ON CONFLICT (sku) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,description=EXCLUDED.description,image_url=EXCLUDED.image_url,status=EXCLUDED.status,price=EXCLUDED.price,published_at=EXCLUDED.published_at;

DELETE FROM product_categories pc USING products p,categories c
WHERE pc.product_id=p.id AND pc.category_id=c.id
  AND p.slug IN ('judogi-competencia-azul','judogi-entrenamiento-blanco','bjj-gi-negro','rashguard-tatami','cinturon-bjj-azul','prototipo-judogi','cinturon-bjj-morado','conjunto-entrenamiento-verde','conjunto-entrenamiento-negro','camisa-entrenamiento-blanca','camisa-entrenamiento-negra','sudadera-oje-verde','sudadera-oje-gris','medias-oje-blancas','medias-oje-verdes')
  AND c.slug IN ('judo-gi','bjj-gi','rashguard','cinturones');
INSERT INTO product_categories (product_id, category_id)
SELECT p.id,c.id FROM (VALUES
('judogi-competencia-azul','judo'),('judogi-competencia-azul','kimonos'),
('judogi-entrenamiento-blanco','judo'),('judogi-entrenamiento-blanco','kimonos'),
('bjj-gi-negro','bjj'),('bjj-gi-negro','kimonos'),('rashguard-tatami','bjj'),('rashguard-tatami','camisas'),
('cinturon-bjj-azul','bjj'),('cinturon-bjj-azul','cinturones'),('prototipo-judogi','judo'),('prototipo-judogi','kimonos'),
('cinturon-bjj-morado','bjj'),('cinturon-bjj-morado','cinturones'),
('conjunto-entrenamiento-verde','judo'),('conjunto-entrenamiento-verde','bjj'),('conjunto-entrenamiento-verde','conjuntos-entrenamiento'),
('conjunto-entrenamiento-negro','judo'),('conjunto-entrenamiento-negro','bjj'),('conjunto-entrenamiento-negro','conjuntos-entrenamiento'),
('camisa-entrenamiento-blanca','judo'),('camisa-entrenamiento-blanca','bjj'),('camisa-entrenamiento-blanca','camisas'),
('camisa-entrenamiento-negra','judo'),('camisa-entrenamiento-negra','bjj'),('camisa-entrenamiento-negra','camisas'),
('sudadera-oje-verde','judo'),('sudadera-oje-verde','bjj'),('sudadera-oje-verde','sudaderas'),
('sudadera-oje-gris','judo'),('sudadera-oje-gris','bjj'),('sudadera-oje-gris','sudaderas'),
('medias-oje-blancas','judo'),('medias-oje-blancas','bjj'),('medias-oje-blancas','medias'),
('medias-oje-verdes','judo'),('medias-oje-verdes','bjj'),('medias-oje-verdes','medias')
) AS x(product_slug,category_slug)
JOIN products p ON p.slug=x.product_slug JOIN categories c ON c.slug=x.category_slug
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id,sku,size,color)
SELECT p.id,v.sku,v.size,v.color FROM (VALUES
('judogi-competencia-azul','OJE-JD-001-A1','A1','Azul'),('judogi-competencia-azul','OJE-JD-001-A2','A2','Azul'),
('judogi-entrenamiento-blanco','OJE-JD-002-A2','A2','Blanco'),('judogi-entrenamiento-blanco','OJE-JD-002-A3','A3','Blanco'),
('bjj-gi-negro','OJE-BJ-001-A1','A1','Negro'),('bjj-gi-negro','OJE-BJ-001-A2','A2','Negro'),
('rashguard-tatami','OJE-BJ-002-M','M','Negro'),('cinturon-bjj-azul','OJE-PR-001-A2','240 cm','Azul'),('cinturon-bjj-azul','OJE-PR-001-260','260 cm','Azul'),
('prototipo-judogi','OJE-DRAFT-001-A1','A1','Blanco'),('cinturon-bjj-morado','OJE-PR-002-240','240 cm','Morado'),('cinturon-bjj-morado','OJE-PR-002-260','260 cm','Morado'),
('conjunto-entrenamiento-verde','OJE-SET-001-S','S','Verde'),('conjunto-entrenamiento-verde','OJE-SET-001-M','M','Verde'),
('conjunto-entrenamiento-negro','OJE-SET-002-M','M','Negro'),('conjunto-entrenamiento-negro','OJE-SET-002-L','L','Negro'),
('camisa-entrenamiento-blanca','OJE-TEE-001-M','M','Blanco'),('camisa-entrenamiento-blanca','OJE-TEE-001-L','L','Blanco'),
('camisa-entrenamiento-negra','OJE-TEE-002-M','M','Negro'),('camisa-entrenamiento-negra','OJE-TEE-002-L','L','Negro'),
('sudadera-oje-verde','OJE-HOOD-001-M','M','Verde'),('sudadera-oje-verde','OJE-HOOD-001-L','L','Verde'),
('sudadera-oje-gris','OJE-HOOD-002-M','M','Gris'),('sudadera-oje-gris','OJE-HOOD-002-L','L','Gris'),
('medias-oje-blancas','OJE-SOCK-001-SM','S/M','Blanco'),('medias-oje-blancas','OJE-SOCK-001-LXL','L/XL','Blanco'),
('medias-oje-verdes','OJE-SOCK-002-SM','S/M','Verde'),('medias-oje-verdes','OJE-SOCK-002-LXL','L/XL','Verde')
) AS v(product_slug,sku,size,color) JOIN products p ON p.slug=v.product_slug
ON CONFLICT (sku) DO UPDATE SET size=EXCLUDED.size,color=EXCLUDED.color;

INSERT INTO inventory (variant_id,on_hand,reserved)
SELECT pv.id,COALESCE(d.on_hand,2),0 FROM product_variants pv
LEFT JOIN (VALUES
('OJE-JD-001-A1',8),('OJE-JD-001-A2',3),('OJE-JD-002-A2',12),('OJE-JD-002-A3',5),
('OJE-BJ-001-A1',4),('OJE-BJ-001-A2',9),('OJE-BJ-002-M',20),('OJE-PR-001-A2',15),('OJE-PR-001-260',8),
('OJE-DRAFT-001-A1',2),('OJE-PR-002-240',10),('OJE-PR-002-260',6),('OJE-SET-001-S',7),('OJE-SET-001-M',4),
('OJE-SET-002-M',5),('OJE-SET-002-L',3),('OJE-TEE-001-M',16),('OJE-TEE-001-L',10),('OJE-TEE-002-M',12),('OJE-TEE-002-L',8),
('OJE-HOOD-001-M',6),('OJE-HOOD-001-L',4),('OJE-HOOD-002-M',5),('OJE-HOOD-002-L',3),
('OJE-SOCK-001-SM',24),('OJE-SOCK-001-LXL',18),('OJE-SOCK-002-SM',20),('OJE-SOCK-002-LXL',14)
) AS d(sku,on_hand) ON d.sku=pv.sku
WHERE d.sku IS NOT NULL
ON CONFLICT (variant_id) DO UPDATE SET on_hand=GREATEST(EXCLUDED.on_hand,inventory.reserved),updated_at=now();

INSERT INTO collections (slug, title, description, status, is_featured) VALUES
('destacados', 'Selección OJE', 'Productos destacados para entrenar.', 'publicado', true),
('entrenamiento', 'Entrenamiento diario', 'Equipo para sesiones de práctica.', 'publicado', false)
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, status=EXCLUDED.status, is_featured=EXCLUDED.is_featured;
INSERT INTO collection_products (collection_id, product_id, position)
SELECT c.id,p.id,x.position FROM (VALUES ('destacados','judogi-competencia-azul',1),('destacados','bjj-gi-negro',2),('destacados','rashguard-tatami',3),('entrenamiento','judogi-entrenamiento-blanco',1)) x(collection_slug,product_slug,position)
JOIN collections c ON c.slug=x.collection_slug JOIN products p ON p.slug=x.product_slug
ON CONFLICT (collection_id, product_id) DO UPDATE SET position=EXCLUDED.position;

INSERT INTO customers (email, first_name, last_name, phone) VALUES
('ana.mora@example.test','Ana','Mora','8888-1001'), ('luis.vega@example.test','Luis','Vega','8888-1002'),
('sofia.rojas@example.test','Sofía','Rojas','8888-1003'), ('diego.soto@example.test','Diego','Soto','8888-1004'),
('maria.campos@example.test','María','Campos','8888-1005'), ('pablo.cruz@example.test','Pablo','Cruz','8888-1006')
ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, phone=EXCLUDED.phone;

INSERT INTO addresses (customer_id, city_id, address_line, postal_code, recipient_name, phone, is_default)
SELECT cu.id, ci.id, x.address_line, x.postal_code, cu.first_name || ' ' || cu.last_name, cu.phone, true
FROM (VALUES ('ana.mora@example.test','San José','San José','Calle 1, Casa 10','10101'),
('luis.vega@example.test','Heredia','Heredia','Avenida 2, Casa 8','40101'),
('sofia.rojas@example.test','Cartago','Cartago','Residencial Los Pinos 5','30101'),
('diego.soto@example.test','Liberia','Guanacaste','Barrio Centro, Casa 4','50101'),
('maria.campos@example.test','Limón','Limón','Barrio Roosevelt, Casa 9','70101'),
('pablo.cruz@example.test','Puntarenas','Puntarenas','El Roble, Casa 2','60101')) x(email,city_name,province,address_line,postal_code)
JOIN customers cu ON cu.email=x.email JOIN cities ci ON ci.name=x.city_name AND ci.province=x.province
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.customer_id=cu.id AND a.is_default);

INSERT INTO coupons (code, discount_type, discount_value, starts_at, expires_at, usage_limit, per_customer_limit, minimum_subtotal, is_active) VALUES
('JUDO10','percent',10,now()-interval '30 days',now()+interval '60 days',100,1,10000,true),
('GRAPPLING5000','fixed',5000,now()-interval '10 days',now()+interval '20 days',50,1,25000,true),
('EXPIRED20','percent',20,now()-interval '90 days',now()-interval '1 day',100,1,0,true),
('SOLDOUT15','percent',15,now()-interval '30 days',now()+interval '30 days',2,1,0,true)
ON CONFLICT (code) DO UPDATE SET discount_type=EXCLUDED.discount_type, discount_value=EXCLUDED.discount_value, starts_at=EXCLUDED.starts_at, expires_at=EXCLUDED.expires_at, usage_limit=EXCLUDED.usage_limit, per_customer_limit=EXCLUDED.per_customer_limit, minimum_subtotal=EXCLUDED.minimum_subtotal, is_active=EXCLUDED.is_active;

-- Ten recent orders cover paid, processing, shipped and cancelled states, including a reversed valid coupon. Item prices are snapshots.
INSERT INTO orders (order_number, customer_id, status, currency, subtotal, discount_total, shipping_total, tax_total, total, coupon_id, shipping_city_name, shipping_province, shipping_address_line, shipping_cost_snapshot, placed_at, shipped_at, cancelled_at)
SELECT x.order_number, cu.id, x.status, 'CRC', x.subtotal, x.discount_total, CASE WHEN x.subtotal - x.discount_total >= (SELECT (setting_value->>'amount')::numeric FROM app_settings WHERE setting_key='free_shipping_threshold_crc') THEN 0 ELSE ci.shipping_cost END, 0,
       x.subtotal - x.discount_total + CASE WHEN x.subtotal - x.discount_total >= (SELECT (setting_value->>'amount')::numeric FROM app_settings WHERE setting_key='free_shipping_threshold_crc') THEN 0 ELSE ci.shipping_cost END, cp.id, x.city_name, x.province, x.address_line, ci.shipping_cost,
       now() - x.age, CASE WHEN x.status IN ('shipped','delivered') THEN now() - x.age + interval '1 day' END,
       CASE WHEN x.status='cancelled' THEN now() - x.age + interval '2 hours' END
FROM (VALUES
('OJE-DEMO-1001','ana.mora@example.test','paid',42000::numeric,4200::numeric,'JUDO10','San José','San José','Calle 1, Casa 10',interval '1 day'),
('OJE-DEMO-1002','luis.vega@example.test','processing',48500::numeric,5000::numeric,'GRAPPLING5000','Heredia','Heredia','Avenida 2, Casa 8',interval '2 days'),
('OJE-DEMO-1003','sofia.rojas@example.test','shipped',18500::numeric,0::numeric,NULL,'Cartago','Cartago','Residencial Los Pinos 5',interval '3 days'),
('OJE-DEMO-1004','diego.soto@example.test','paid',31500::numeric,0::numeric,NULL,'Liberia','Guanacaste','Barrio Centro, Casa 4',interval '4 days'),
('OJE-DEMO-1005','maria.campos@example.test','cancelled',9500::numeric,0::numeric,NULL,'Limón','Limón','Barrio Roosevelt, Casa 9',interval '5 days'),
('OJE-DEMO-1006','pablo.cruz@example.test','delivered',48500::numeric,0::numeric,NULL,'Puntarenas','Puntarenas','El Roble, Casa 2',interval '6 days'),
('OJE-DEMO-1007','ana.mora@example.test','paid',18500::numeric,0::numeric,NULL,'San José','San José','Calle 1, Casa 10',interval '7 hours'),
('OJE-DEMO-1008','luis.vega@example.test','processing',42000::numeric,0::numeric,NULL,'Heredia','Heredia','Avenida 2, Casa 8',interval '8 hours'),
('OJE-DEMO-1009','sofia.rojas@example.test','paid',9500::numeric,0::numeric,NULL,'Cartago','Cartago','Residencial Los Pinos 5',interval '10 hours'),
('OJE-DEMO-1010','maria.campos@example.test','cancelled',18500::numeric,1850::numeric,'JUDO10','Limón','Limón','Barrio Roosevelt, Casa 9',interval '12 hours')
) AS x(order_number,email,status,subtotal,discount_total,coupon_code,city_name,province,address_line,age)
JOIN customers cu ON cu.email=x.email JOIN cities ci ON ci.name=x.city_name AND ci.province=x.province
LEFT JOIN coupons cp ON cp.code=x.coupon_code
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO order_items (order_id, variant_id, product_name_snapshot, sku_snapshot, variant_snapshot, quantity, unit_price, line_total)
SELECT o.id, pv.id, p.name, pv.sku, pv.size || ' / ' || pv.color, 1, p.price, p.price
FROM (VALUES ('OJE-DEMO-1001','OJE-JD-001-A1'),('OJE-DEMO-1002','OJE-BJ-001-A1'),('OJE-DEMO-1003','OJE-BJ-002-M'),('OJE-DEMO-1004','OJE-JD-002-A2'),('OJE-DEMO-1005','OJE-PR-001-A2'),('OJE-DEMO-1006','OJE-BJ-001-A2'),('OJE-DEMO-1007','OJE-BJ-002-M'),('OJE-DEMO-1008','OJE-JD-001-A2'),('OJE-DEMO-1009','OJE-PR-001-A2'),('OJE-DEMO-1010','OJE-BJ-002-M')) x(order_number,variant_sku)
JOIN orders o ON o.order_number=x.order_number JOIN product_variants pv ON pv.sku=x.variant_sku JOIN products p ON p.id=pv.product_id
ON CONFLICT (order_id, variant_id) DO NOTHING;

-- Cancelled before shipment while the coupon remains valid: usage is retained as reversed history.
INSERT INTO coupon_redemptions (coupon_id, customer_id, order_id, status, redeemed_at, reversed_at)
SELECT cp.id,o.customer_id,o.id,'reversed',o.placed_at,o.cancelled_at FROM orders o JOIN coupons cp ON cp.id=o.coupon_id
WHERE o.order_number='OJE-DEMO-1010'
ON CONFLICT (order_id) DO NOTHING;
INSERT INTO coupon_redemptions (coupon_id, customer_id, order_id, status, redeemed_at)
SELECT cp.id,o.customer_id,o.id,'redeemed',o.placed_at FROM orders o JOIN coupons cp ON cp.id=o.coupon_id
WHERE o.status <> 'cancelled'
ON CONFLICT (order_id) DO NOTHING;

-- Exhaust the two-use demonstration coupon without violating one-use-per-customer.
INSERT INTO orders (order_number, customer_id, status, subtotal, discount_total, shipping_total, tax_total, total, coupon_id, shipping_city_name, shipping_province, shipping_address_line, shipping_cost_snapshot, placed_at)
SELECT 'OJE-DEMO-SOLDOUT-' || cu.id, cu.id, 'paid', 18500, 2775, ci.shipping_cost, 0, 18500 - 2775 + ci.shipping_cost, cp.id, ci.name, ci.province, 'Seed soldout address', ci.shipping_cost, now()-interval '2 days'
FROM customers cu JOIN coupons cp ON cp.code='SOLDOUT15' JOIN cities ci ON ci.name='San José' AND ci.province='San José'
WHERE cu.email IN ('diego.soto@example.test','maria.campos@example.test')
ON CONFLICT (order_number) DO NOTHING;
INSERT INTO coupon_redemptions (coupon_id, customer_id, order_id, status)
SELECT cp.id,o.customer_id,o.id,'redeemed' FROM orders o JOIN coupons cp ON cp.id=o.coupon_id WHERE cp.code='SOLDOUT15'
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO order_events (order_id, from_status, to_status, note, created_at)
SELECT id, NULL, status, 'Estado inicial de la orden de demostración', placed_at FROM orders
WHERE order_number LIKE 'OJE-DEMO-%'
ON CONFLICT DO NOTHING;



INSERT INTO order_items (order_id, variant_id, product_name_snapshot, sku_snapshot, variant_snapshot, quantity, unit_price, line_total)
SELECT o.id, pv.id, p.name, pv.sku, pv.size || ' / ' || pv.color, 1, p.price, p.price
FROM orders o JOIN product_variants pv ON pv.sku='OJE-BJ-002-M' JOIN products p ON p.id=pv.product_id
WHERE o.order_number LIKE 'OJE-DEMO-SOLDOUT-%'
ON CONFLICT (order_id, variant_id) DO NOTHING;


