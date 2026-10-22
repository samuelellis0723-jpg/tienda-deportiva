# Modelo de dominio y contratos API

## Entidades y relaciones

- `users`: identidad administrativa, email único, hash de contraseña, estado. `roles` + `user_roles` para permisos (mínimo `admin`, `operator`). No guardar contraseñas en texto plano.
- `categories`: jerarquía opcional (`parent_id`), slug único, nombre, estado. Un producto puede pertenecer a varias categorías mediante `product_categories`.
- `products`: SKU base, slug, nombre, descripción, estado `draft|published`, precio base, moneda `CRC`, marcas de tiempo. Productos borrador nunca aparecen en endpoints públicos.
- `product_variants`: producto, SKU único, talla/color y estado. `inventory`: cantidad disponible y reservada por variante; cambios auditables.
- `collections`: slug, título, descripción, estado, rango/fechas opcionales. `collection_products`: productos y posición. Las destacadas son colecciones publicadas marcadas como destacadas, no una lista codificada en el frontend.
- `customers`: contacto mínimo del comprador. `addresses`: direcciones asociadas; snapshots de envío/facturación se guardan en la orden para conservar historial.
- `carts` y `cart_items`: carrito asociado a sesión/cliente y variante/cantidad; precio siempre se recalcula en backend.
- `orders`: número público no secuencial, cliente, estado, moneda, subtotal, descuento, envío, impuesto y total en snapshot. `order_items`: snapshots de SKU, variante, nombre y precios. `order_events`: historial append-only de transiciones.
- `payments`: proveedor, referencia externa única, estado y montos; nunca almacenar datos de tarjeta. `shipments`: transportista, tracking y estado.
- `coupons`: código normalizado único, regla de descuento, vigencia, límites globales/por cliente, mínimo de compra y estado. `coupon_redemptions`: orden y cliente, restricción única para evitar doble consumo.
- `audit_log`: actor, acción, recurso, fecha y metadatos redactados para cambios administrativos críticos.

Relaciones principales: producto↔categoría y producto↔colección son muchos a muchos; producto→variantes uno a muchos; variante→inventario uno a uno; carrito→items y orden→items uno a muchos; cliente→órdenes uno a muchos; cupón↔órdenes mediante redenciones. Todos los importes usan decimal exacto y moneda explícita.

## Reglas de dominio

- Publicar requiere al menos una variante vendible y precio válido. Solo `published` aparece en catálogo público.
- Catálogo: paginación, categoría, texto, disponibilidad y ordenamiento permitidos; detalles por slug. Las colecciones destacadas son públicas y solo incluyen productos publicados/disponibles.
- Envío gratis: propuesta de ₡35 000 CRC sobre subtotal elegible posterior al descuento y previo a impuesto y envío. Backend calcula y devuelve desglose; umbral configurable.
- Cupón: validar vigencia, estado, límites, mínimo y compatibilidad antes de crear reserva/redención. Un descuento no puede exceder el subtotal elegible.
- Cancelación: transición permitida solo antes del envío. Liberar inventario y revertir una redención de uso limitado una única vez; solo si el cupón todavía está vigente. Mantener historial de uso/reversión. Órdenes enviadas no se cancelan por esta ruta y requieren flujo de devolución separado.
- Checkout y pagos: cotización del servidor, reserva temporal de inventario, creación idempotente de orden y confirmación de pago mediante webhook verificado. Estados de pago no se infieren de la redirección del navegador.

## API REST propuesta (`/api/v1`)

Público:

- `GET /categories`
- `GET /collections/featured`
- `GET /collections/:slug`
- `GET /products?category=&q=&available=&sort=&page=&limit=`
- `GET /products/:slug`
- `POST /carts`, `GET /carts/:id`, `POST /carts/:id/items`, `PATCH /carts/:id/items/:itemId`, `DELETE /carts/:id/items/:itemId`
- `POST /checkout/quote` (precios, cupón y envío recalculados)
- `POST /checkout/orders` (clave `Idempotency-Key` obligatoria)
- `POST /payments/webhooks/:provider` (firma validada)
- `GET /orders/:publicId/status` (requiere token de acceso firmado y limitado; nunca enumerable)

Autenticación/admin:

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `GET /admin/dashboard`
- `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/cancel`
- `GET|POST /admin/coupons`, `GET|PATCH|DELETE /admin/coupons/:id`
- Productos/categorías/colecciones se gestionan desde rutas `/admin/products`, `/admin/categories`, `/admin/collections` (CRUD y transición explícita de publicación).

Herramientas n8n (solo lectura):

- `GET /agent/catalog/search?q=&category=&limit=`
- `GET /agent/products/:slug`
- `GET /agent/orders/:publicId/status` con credencial técnica y verificación adicional del cliente.

## Contrato de respuesta y error

Éxito: recurso JSON o colección `{ "data": ..., "meta": { "page": 1, "limit": 20, "total": 0 } }`. Error uniforme: `{ "error": { "code": "VALIDATION_ERROR", "message": "Solicitud no válida", "details": [], "requestId": "..." } }`. Códigos HTTP: 400 entrada inválida, 401 no autenticado, 403 sin permiso, 404 no existe/no visible, 409 conflicto de estado/stock/idempotencia, 422 regla de negocio, 429 límite excedido, 500 error inesperado. No exponer trazas, SQL ni secretos; `requestId` correlaciona logs.

## Ambigüedades para validar antes de implementar

Umbral de envío ₡35 000 es propuesta; faltan transportista/costos, impuestos aplicables, política de devolución, pasarela de pago, retención de inventario, reglas exactas de cupones y consentimiento/retención del agente. La cancelación del cupón presupone reversión mientras no haya envío y cupón vigente; confirmar con política comercial.
