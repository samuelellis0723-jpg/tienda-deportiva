# Tienda pública OJE

## Ejecutar

```sh
npm install
cp .env.example .env
npm run dev
```

Vite sirve la tienda en el puerto 5173 y envía `/api` al backend en `http://localhost:3000`. Ajusta `VITE_API_BASE_URL` si la API vive en otro origen. `npm run build` genera el sitio estático. Este paquete no tiene configuración de lint.

## Webhook de n8n para ciudades y envíos

Configura `VITE_N8N_WEBHOOK_URL` con la URL pública del webhook y reinicia Vite. La tienda envía JSON con una acción:

- `{ "action": "cities" }` devuelve `{ "ok": true, "data": [{ "id": 1, "name": "San José", "province": "San José", "shippingCost": 1800 }], "error": null }`.
- `{ "action": "coverage", "cityId": 1, "subtotal": 20000 }` devuelve `{ "ok": true, "data": { "covered": true, "shippingCost": 1800, "freeShipping": false, "freeShippingThreshold": 35000, "message": "..." }, "error": null }`.
- Errores devuelven `{ "ok": false, "data": null, "error": "mensaje" }`.

El flujo n8n debe leer las ciudades y estimaciones desde `GET /api/ciudades` y `POST /api/envios/cotizar`; no mantenga tablas de ciudades ni tarifas en n8n. La tienda no usa ciudades o cobertura de respaldo: sin webhook no permite enviar la orden.

## Notas de API y catálogo

La búsqueda pública consulta solo productos publicados en `GET /api/productos`; detalle usa `GET /api/productos/:id`. El cupón se prevalida con `POST /api/cupones/validar` desde productos/cantidades; el checkout crea la orden con `POST /api/ordenes` e `Idempotency-Key`. Las cotizaciones del navegador son orientativas, y la API vuelve a calcular los importes y disponibilidad.

La portada presenta categorías Judo y BJJ como accesos destacados, obtenidos de categorías activas. El backend devuelve `imageUrl` cuando el producto tiene una imagen guardada. Si falta o no carga, la tienda presenta un panel editorial OJE. Las imágenes se entregan como URL, nunca como base64 ni se persisten en el carrito.

## Administración

El panel administrativo está en `/admin/login`; las rutas de resumen, productos, órdenes y cupones requieren una sesión administrativa vigente. El frontend consulta `/api/auth/me` al iniciar, envía las cookies con `credentials: include` y no guarda credenciales ni tokens en almacenamiento del navegador. El inicio de sesión no registra usuarios: usa las cuentas administrativas configuradas en el backend. La confirmación de pago es manual y solo registra una recepción ocurrida fuera del sistema.

## Acciones del asistente n8n

- `recommend`: recibe `items` con `productId`, `name`, `size`, `color` y `quantity`; devuelve `{ "ok": true, "data": { "products": [] }, "error": null }`. La IA solo elige IDs y n8n responde los productos originales que aun pertenecen al catalogo publico disponible.
- `description`: recibe `name`, `category` y `features` opcionales; responde `{ "ok": true, "data": { "description": "..." }, "error": null }`. No se deben inferir especificaciones no recibidas.

Importa `n8n/oje-assistant.workflow.json`. Configura la variable n8n `OJE_API_BASE_URL` con la URL base de Express alcanzable desde n8n, sin `/` final; selecciona una credencial de modelo en el nodo correspondiente y activa el workflow. Copia la Production URL del nodo Webhook a `VITE_N8N_WEBHOOK_URL`. La Test URL sirve mientras el workflow escucha pruebas. Cambia `Allowed Origins (CORS)` a los origenes exactos de frontend en desarrollo y produccion. n8n consulta la API en cada solicitud y recomienda entre los 100 productos publicados/disponibles mas recientes.

El endpoint de IA es publico desde el navegador. CORS no bloquea llamadas directas de otros clientes: limita frecuencia y gasto en el proxy/WAF antes de produccion. El checkout vuelve a validar la orden completa en Express.