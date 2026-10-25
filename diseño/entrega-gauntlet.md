# Entrega del rediseño OJE

## A. Sistema de diseño

Tokens compartidos, tipografía del sistema, botones/campos/checkbox/radio, tarjetas y badges, diálogos/drawers nativos, tabs con teclado, toast, acordeones, breadcrumbs, skeletons, tablas ordenables, paginación, vacíos y errores. Foco y movimiento reducido. Ilustración SVG original.

## B. Tienda

Header sticky con categorías reales y mega menú, drawer móvil, búsqueda con sugerencias y mini carrito; aviso de almacenamiento y footer con rutas reales. Inicio editorial, categorías y productos recientes. Catálogo paginado desde servidor con filtros y selección rápida de variantes. Detalle con ampliación de la imagen disponible, especificaciones reales, compra sticky y relacionados. Carrito con cantidades, cupón y estimación de envío. Checkout con pago manual, validación nativa, cotización existente e intento idempotente protegido durante navegación/reintentos. Ayuda y 404.

## C. Administración

Login con sesión existente por cookie, navegación lateral contraíble, menú móvil y breadcrumbs; métricas/gráficos/reposición y órdenes recientes desde servicios reales. Tablas con orden, paginación y regiones enfocables. Productos/variantes con preview, publicación y despublicación múltiple confirmada. Órdenes con detalle, eventos, pago manual y confirmaciones. Cupones con validaciones y estados.

## Verificación real

| Comando / comprobación | Resultado |
| --- | --- |
| frontend: npm test | 10/10 pasan, sin errores/advertencias |
| frontend: npm run build | Correcto, 85 módulos, sin errores/advertencias; rutas divididas en chunks |
| node --test n8n/tests/workflow-contract.test.mjs | 6/6 pasan |
| frontend: node scripts/check-contrast.mjs | 15/15 pares pasan; resultado en contraste.json |
| git diff --check | Correcto |
| Preview inicio y catálogo | HTTP 200; no equivale a render visual |
| Lectura API por proxies existentes | health, categorías y productos HTTP 200 |
| Webhook cities y coverage | ok:true; 6 ciudades y cotización con umbral |
| Backend npm test / npm run check | No ejecutados: backend sin cambios |
| Viewports 360, 768, 1280 y 1920 | Sin verificar: inventario de navegadores vacío |
| Lighthouse móvil | No medido; no se atribuye puntuación |

El servidor de preview creado para las comprobaciones se detuvo al terminar. Para abrir localmente: ejecutar `npm run dev` dentro de frontend.

## Pendientes y límites

No se declara cumplimiento total del Gauntlet, WCAG 2.2 AA ni Lighthouse >=90. Faltan inspección visual en los cuatro tamaños, recorrido de teclado/lector y admin autenticado, compra/reserva real y verificación del despliegue de migraciones PostgreSQL. La lectura de ciudades/cotización sí se ejecutó; las acciones IA de recomendación/descripción solo se revisaron por contratos y código, sin verificar ejecución de modelo en producción. No se crearon órdenes ni se registraron pagos de prueba contra la API local.

Faltan datos comerciales reales para contacto/redes, política de cambios y tabla de centímetros de cada modelo. Se evitó inventarlos. La API sólo entrega una imagen por producto; no se simulan ángulos adicionales. Una recarga forzada pierde el intento de orden guardado en memoria; se muestra aviso nativo mientras está pendiente.

## Decisiones y preservación

Detalle en decisiones.md. Sin dependencias nuevas, commits, publicación, lectura/edición directa de archivos de entorno, modificación de contratos, backend o workflows. Se conservan los dos documentos nuevos del usuario en documentacion-ia; no existían cambios staged al inicio ni se agregaron al índice. Se conserva la pila y la organización efectiva del proyecto. El dev script importa directamente la configuración Vite para evitar el fallo de esbuild al resolver directorios superiores en este sandbox.

## Archivos modificados
- `diseño/DESIGN.md`
- `frontend/README.md`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/src/App.jsx`
- `frontend/src/assets/styles/admin.css`
- `frontend/src/assets/styles/global.css`
- `frontend/src/assets/styles/store.css`
- `frontend/src/assets/styles/variables.css`
- `frontend/src/components/layout/AdminLayout.jsx`
- `frontend/src/components/layout/StoreLayout.jsx`
- `frontend/src/components/ui/AsyncState.jsx`
- `frontend/src/components/ui/ProductArtwork.jsx`
- `frontend/src/components/ui/ProductCard.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/CartContext.jsx`
- `frontend/src/hooks/useDocumentTitle.js`
- `frontend/src/pages/CartPage.jsx`
- `frontend/src/pages/CatalogPage.jsx`
- `frontend/src/pages/CheckoutPage.jsx`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/ProductPage.jsx`
- `frontend/src/pages/auth/AdminLoginPage.jsx`
- `frontend/src/pages/cupones/AdminCouponsPage.jsx`
- `frontend/src/pages/dashboard/DashboardPage.jsx`
- `frontend/src/pages/ordenes/AdminOrdersPage.jsx`
- `frontend/src/pages/productos/AdminProductsPage.jsx`
- `frontend/src/routes/Routing.jsx`
- `frontend/src/services/admin-product-service.js`
- `frontend/src/services/api-client.js`
- `frontend/src/services/order-service.js`
- `frontend/src/services/product-service.js`
- `frontend/src/utils/format.js`
- `frontend/tests/product-artwork.test.js`

## Archivos creados

- `diseño/analisis-referencia.md`
- `diseño/bitacora-gauntlet.md`
- `diseño/contraste.json`
- `diseño/decisiones.md`
- `diseño/entrega-gauntlet.md`
- `frontend/scripts/check-contrast.mjs`
- `frontend/scripts/dev.mjs`
- `frontend/src/components/admin/AdminTableTools.jsx`
- `frontend/src/components/layout/StoreHeader.jsx`
- `frontend/src/components/ui/CartEstimate.jsx`
- `frontend/src/components/ui/Overlay.jsx`
- `frontend/src/components/ui/Tabs.jsx`
- `frontend/src/components/ui/TatamiArtwork.jsx`
- `frontend/src/components/ui/Toast.jsx`
- `frontend/src/context/OrderContext.jsx`
- `frontend/src/context/StoreContext.jsx`
- `frontend/src/pages/HelpPage.jsx`
- `frontend/src/pages/NotFoundPage.jsx`
- `frontend/src/services/order-attempt.js`
- `frontend/src/utils/cart-quantity.js`
- `frontend/tests/order-attempt.test.js`
- `frontend/tests/store-contract.test.js`
