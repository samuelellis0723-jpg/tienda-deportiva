# OJE — tienda deportiva

Tienda de ropa y equipo para Judo y BJJ. Este repositorio contiene el diseño y la base de implementación.

## Stack

- `frontend/`: React, Vite y React Router.
- `backend/`: Node.js, Express y PostgreSQL; la API sigue rutas → controladores → servicios → modelos.
- `documentacion-ia/`: arquitectura del agente de n8n, que consume la API y no accede directamente a PostgreSQL.

## Backend

Las instrucciones de dependencias, variables de entorno, migración y seeds están en `backend/database/README.md`. Los endpoints iniciales y filtros están descritos en `documentacion-ia/CONTRATOS_API.md`.

La API de catálogo usa PostgreSQL existente. Los productos públicos solo incluyen estado `publicado`; las operaciones administrativas usan sesión de usuario almacenada en cookie `HttpOnly`. No se usa token administrativo compartido.

El inventario vive únicamente en `inventory`: la cantidad física es `on_hand` y la disponible es `on_hand - reserved`, por variante. No hay stock duplicado en `products` o `product_variants`.

## Estado de la base de datos

Las migraciones y los seeds están preparados, pero no se han ejecutado contra PostgreSQL en este entorno. La primera conexión real debe aplicar `backend/database/migrations/001_initial_schema.sql`, `backend/database/migrations/002_admin_sessions.sql`, `backend/database/migrations/003_order_idempotency_fingerprint.sql`, `backend/database/migrations/004_product_image_url.sql` y finalmente `backend/database/seeds/001_demo_data.sql`.
