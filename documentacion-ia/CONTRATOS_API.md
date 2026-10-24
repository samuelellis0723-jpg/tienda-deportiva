# Modelo de dominio y contratos API

## Entidades y relaciones

- `users`: identidad administrativa, email único, hash de contraseña, estado. `roles` + `user_roles` para permisos (mínimo `admin`, `operator`). No guardar contraseñas en texto plano.
- `categories`: jerarquía opcional (`parent_id`), slug único, nombre, estado. Un producto puede pertenecer a varias categorías mediante `product_categories`.
- `products`: SKU base, slug, nombre, descripción, estado `draft|published`, precio base, moneda `CRC`, marcas de tiempo. Productos borrador nunca aparecen en endpoints públicos.
- `product_variants`: producto, SKU único, talla/color y estado. `inventory`: cantidad disponible y reservada por variante; cambios auditables.
- `collections`: slug, título, descripción, estado, rango/fechas opcionales. `collection_products`: productos y posición. Las destacadas son colecciones publicadas marcadas como destacadas, no una lista codificada en el frontend.
- `cities`: ciudad/provincia con costo de envío vigente. `customers`: contacto mínimo del comprador. `addresses`: direcciones asociadas; snapshots de envío/facturación se guardan en la orden para conservar historial.
- `carts` y `cart_items`: carrito asociado a sesión/cliente y variante/cantidad; precio siempre se recalcula en backend.
- `orders`: número público no secuencial, cliente, estado, moneda, subtotal, descuento, envío, impuesto y total en snapshot. `order_items`: snapshots de SKU, variante, nombre y precios. `order_events`: historial append-only de transiciones.
- `payments`: proveedor, referencia externa única, estado y montos; nunca almacenar datos de tarjeta. `shipments`: transportista, tracking y estado.
- `coupons`: código normalizado único, regla de descuento, vigencia, límites globales/por cliente, mínimo de compra y estado. `coupon_redemptions`: orden y cliente, restricción única para evitar doble consumo.
- `audit_log`: actor, acción, recurso, fecha y metadatos redactados para cambios administrativos críticos.

Relaciones principales: producto↔categoría y producto↔colección son muchos a muchos; producto→variantes uno a muchos; variante→inventario uno a uno; carrito→items y orden→items uno a muchos; cliente→órdenes uno a muchos; cupón↔órdenes mediante redenciones. Todos los importes usan decimal exacto y moneda explícita. `app_settings` centraliza el umbral de envío y las condiciones de restitución; nunca se duplican como constantes comerciales. El esquema físico usa `borrador`/`publicado` para los estados conceptuales `draft`/`published`.

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

Éxito: recurso JSON o colección `{ "data": ..., "meta": { "page": 1, "limit": 20, "total": 0 } }`. Para la primera fase de Express, los errores siguen `{ "error": "mensaje" }` con códigos 400, 401, 404, 409 y 503 para configuración/indisponibilidad. Los errores no exponen trazas, SQL ni secretos.

## Ambigüedades para validar antes de implementar

Umbral de envío ₡35 000 es propuesta; faltan transportista/costos, impuestos aplicables, política de devolución, pasarela de pago, retención de inventario, reglas exactas de cupones y consentimiento/retención del agente. La cancelación del cupón presupone reversión mientras no haya envío y cupón vigente; confirmar con política comercial.

## Implementación inicial del catálogo

Los primeros endpoints Express están bajo `/api` y usan nombres en español:

- Categorías: `GET|POST /api/categorias`, `GET|PATCH|DELETE /api/categorias/:id`.
- Productos: `GET|POST /api/productos`, `GET|PATCH|DELETE /api/productos/:id`, `POST /api/productos/:id/publicar` y `POST /api/productos/:id/despublicar`.
- `products.image_url` es opcional y listado/detalle lo devuelven como `imageUrl`. La migración `004_product_image_url.sql` se aplica después de `003_order_idempotency_fingerprint.sql`.
- Salud: `GET /api/health` comprueba también la conexión a PostgreSQL.
- El listado usa `q`, `categoria` (ID o slug), `disponible=true|false`, `ordenar=reciente|nombre|precio`, `direccion=asc|desc`, `page` y `limit`. `estado=borrador|publicado` requiere credencial administrativa.
- Autenticación administrativa: `POST /api/auth/login` recibe `{ "email", "password" }`; `POST /api/auth/logout` revoca la sesión actual; `GET /api/auth/me` devuelve el usuario y vencimiento. No hay registro público. El primer usuario `admin` se crea con `npm run admin:create -- admin@dominio.tld`, mediante solicitud interactiva de contraseña; la base guarda solo un hash scrypt. La sesión opaca se guarda como hash SHA-256 en `auth_sessions` (migración `002_admin_sessions.sql`) y se entrega en una cookie `HttpOnly`, `SameSite=Lax` por defecto, `Secure` en producción, con vencimiento de ocho horas. La aplicación web debe enviar `credentials: 'include'`.
- CORS y CSRF: `FRONTEND_ORIGIN` debe ser el origen exacto de la aplicación; la API responde con ese origen y `Access-Control-Allow-Credentials: true`, nunca con `*`. Login, logout y escrituras administrativas exigen cabecera `Origin` coincidente. Para frontend cross-site configura HTTPS y `SESSION_COOKIE_SAME_SITE=none` (que habilita `Secure`). No guardar secretos en `VITE_*`.
- Los endpoints administrativos de categorías/productos, la lectura de borradores y sus transiciones requieren sesión válida de un usuario activo con rol `admin`. Login inválido devuelve 401 genérico, entradas inválidas 400, origen no permitido 403 y rutas sin sesión 401; los errores usan `{ "error": "mensaje" }`. Login está limitado a 10 intentos por IP cada 15 minutos.
- Los errores actuales se responden como `{ "error": "mensaje" }`. Los códigos incluyen 400, 401, 404, 409 y 503 para configuración/indisponibilidad.
- Crear producto acepta `sku`, `slug`, `name`, `description`, `imageUrl`, `price`, `currency`, `categoryIds` y `variants`. `imageUrl` es opcional o `null`; si tiene valor, debe ser una URL absoluta HTTP o HTTPS válida, sin espacios ni credenciales, de hasta 2048 caracteres. No acepta `data:`/base64. `PATCH` acepta el mismo campo; enviar `null` limpia la imagen. Listado y detalle entregan `imageUrl` (nulo si no se configuró). Cada variante lleva `sku`, `size`, `color`, `stock` (cantidad física en `inventory.on_hand`) e `isActive`; la lectura devuelve `availableStock` calculado como `on_hand - reserved`. Las respuestas administrativas incluyen variantes inactivas para que editar el producto no las elimine accidentalmente; las respuestas públicas incluyen solo variantes activas. Para editar variantes se pueden incluir los campos completos y su `id`; omitir una variante la elimina si no tiene referencias históricas o de carrito.
- Publicar requiere precio válido y al menos una variante activa con fila de inventario. Puede tener existencia cero; el catálogo expone disponibilidad por separado.
- DELETE elimina datos dependientes en cascada solo para variantes e inventario que no estén referenciados por órdenes o carritos; las referencias activas producen 409.

## Ciudades, envío y cupones

- `GET /api/ciudades` lista solo ciudades activas. `GET /api/ciudades/:id` consulta una ciudad; las inactivas solo son visibles para admin. `POST|PATCH|DELETE /api/ciudades[/:id]` requieren sesión `admin` y `Origin` permitido. El esquema usa `cities.is_active` como cobertura y `cities.shipping_cost` como tarifa; no hay zonas separadas ni se agrega otra tabla.
- `POST /api/envios/cotizar` recibe `{ "cityId": 1, "subtotal": 20000 }`. Responde si hay cobertura, tarifa y umbral de envío gratis tomado de `app_settings.free_shipping_threshold_crc`. Es solo una estimación; una ciudad inactiva no tiene cobertura.
- `GET|POST /api/cupones`, `GET|PATCH|DELETE /api/cupones/:id` son administrativos y requieren sesión `admin`; escrituras requieren además `Origin` permitido. Se conservan tipos `fixed|percent`, vigencia, límites globales/por cliente, mínimo e indicador activo de `coupons`.
- `POST /api/cupones/validar` es público y recibe `{ "code": "JUDO10", "customerId": 1, "items": [{ "variantId": 1, "quantity": 2 }] }`. No acepta subtotales o precios. Calcula el subtotal desde precios actuales de productos publicados y variantes activas en PostgreSQL. `customerId` es opcional y sirve solo para estimar el límite individual; el checkout debe usar el cliente resuelto por el servidor. Una prevalidación no crea ni consume una redención. Responde `valid`, `subtotal`, `discount` y `message`; cupones vencidos, agotados, usados o que no alcanzan el mínimo devuelven `valid: false`.
- El esquema actual tiene `cities` como unidad de cobertura y tarifas, por lo que no se requiere una migración de zonas. Estas consultas usan los datos de `001_initial_schema.sql` y `002_admin_sessions.sql` existentes.
- El checkout de órdenes recomputa productos, cliente, cupón, elegibilidad, ciudad, umbral y costo dentro de la transacción antes de persistir la orden; nunca toma como autoridad los importes devueltos por estos endpoints de estimación.

## Órdenes e inventario

- `POST /api/ordenes` recibe `{ "customer": { "email", "firstName", "lastName", "phone?" }, "cityId": 1, "addressLine": "...", "items": [{ "variantId": 1, "quantity": 2 }], "couponCode?": "JUDO10" }`, la cabecera `Idempotency-Key` (8–200 caracteres) y un `Origin` permitido. No acepta precios, subtotal, descuento, envío, total ni estado. Responde 201 con la orden creada o la orden anterior para una repetición idéntica de la misma clave; reutilizar la clave con otro contenido devuelve 409.
- El servicio recalcula precios publicados, cupón, uso individual/global, ciudad activa, tarifa y `app_settings.free_shipping_threshold_crc` en una transacción. El envío gratis usa el subtotal posterior al descuento. Descuenta `inventory.on_hand` dentro de la transacción solo después de bloquear filas y comprobar `on_hand - reserved >= quantity`. No altera `reserved` ni crea un pago.
- `GET /api/ordenes` admite filtros administrativos `estado=nueva|pagada|enviada|entregada|cancelada`, `desde`, `hasta`, `q` (número de orden o email), `page` y `limit`. `GET /api/ordenes/:id` devuelve la orden y relaciones (cliente, artículos, eventos, pagos y envío). Ambas rutas requieren sesión `admin`.
- `PATCH /api/ordenes/:id/estado` recibe `{ "estado": "pagada|enviada|entregada" }`; `POST /api/ordenes/:id/cancelar` cancela. Requieren admin y origen permitido. Solo se permiten transiciones contiguas. El esquema existente almacena `pending_payment|paid|processing|shipped|delivered|cancelled`; la API los presenta como `nueva|pagada|enviada|entregada|cancelada`, y normaliza el estado histórico `processing` como `pagada`.
- El cambio a `pagada` solo se permite si ya existe una fila de pago `payments.status='paid'` con monto y moneda coincidentes; este código no crea ni cambia pagos. Sin integración de pago real, una orden nueva queda como `nueva` y no puede avanzar a pagada. `enviada` registra `shipped_at`; no inventa transportista ni tracking. Cancelar antes del envío repone `on_hand` bajo bloqueo y solo revierte la redención si `app_settings.coupon_restore_on_cancel` lo permite y el cupón sigue activo y vigente. Repetir cancelación o cancelar después del envío devuelve 409. Esta API no solicita ni registra reembolsos.
- La migración `003_order_idempotency_fingerprint.sql` agrega la huella del payload a la tabla existente; aplícala después de `001` y `002`, antes de usar esta API.

## Confirmación administrativa de pago y métricas

- `POST /api/ordenes/:id/pago/confirmar` requiere sesión `admin` y `Origin` permitido. Recibe opcionalmente `{ "reference": "referencia externa", "note": "observación" }`; no acepta montos ni moneda. El administrador confirma que recibió el pago fuera del sistema. Se crea un registro `payments` con proveedor `manual`, estado `paid` y el total/moneda guardados en la orden. No se procesan cobros ni reembolsos. Confirmar dos veces o confirmar una orden que ya avanzó devuelve 409.
- La confirmación inserta también un evento de orden de estado sin cambio y un `audit_log` (`payment.manual_confirmed`) en la misma transacción. Después, `PATCH /api/ordenes/:id/estado` puede avanzar la orden a `pagada`; vuelve a verificar que haya un pago por el total y moneda exactos. No se requiere migración: `payments`, `order_events` y `audit_log` ya existen en `001_initial_schema.sql`.
- `GET /api/resumen` y `GET /api/alertas-reposicion` requieren sesión `admin`. El resumen agrega todos los periodos: ventas por categoría, tres productos con más unidades vendidas, promedio del total de órdenes con venta, conteos por estado y conteo de productos publicados/borradores. Las ventas excluyen `pending_payment` y `cancelled`; se incluyen `paid`, `processing`, `shipped` y `delivered`. Ventas por categoría y producto suman `order_items.line_total` histórico antes de descuento de orden y envío; el valor promedio usa `orders.total`. Si un producto pertenece a varias categorías, su venta se atribuye a cada una.
- Las alertas calculan unidades vendidas en los siete días anteriores desde `orders.placed_at`, solo para órdenes con pago y no canceladas. Una variante publicada/activa alerta si su existencia disponible (`inventory.on_hand - inventory.reserved`, cero si falta fila) es cero o no cubre las unidades vendidas en ese periodo. `daysOfStockRemaining` es nulo si no hubo ventas; los productos sin ventas y con existencia positiva no generan alerta. La política no fija cantidades de compra.

## Webhook publico n8n para la tienda

El export `n8n/oje-assistant.workflow.json` expone `POST /webhook/oje-assistant` y responde siempre `{ "ok": true|false, "data": ..., "error": string|null }`. Las acciones son `cities` (lista de `GET /api/ciudades`), `coverage` (`cityId` entero positivo y `subtotal` CRC >= 0 para `POST /api/envios/cotizar`), `description` (`name`, `category`, `features` opcionales) y `recommend` (`items` con `productId` y nombre). `recommend` consulta solo productos publicados/disponibles y valida los IDs propuestos contra las filas devueltas; no acepta IDs del modelo como productos finales. Las respuestas de ciudades/cobertura conservan los datos del backend. Errores de API/modelo se normalizan sin trazas ni credenciales.

El servicio OJE API no depende de n8n para crear órdenes: el checkout siempre vuelve a validar importes, cobertura, cupón y stock en Express. La configuración operativa y ejemplos de prueba están en `n8n/README.md`.