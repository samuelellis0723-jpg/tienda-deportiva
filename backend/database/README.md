# Base de datos local

Requiere PostgreSQL 14 o superior y `psql` en el `PATH`. Ejecuta las migraciones en orden sobre una base de datos de desarrollo vacía. No guardes credenciales reales en este repositorio.

## Migrar

```powershell
$env:PGHOST = 'localhost'
$env:PGPORT = '5432'
$env:PGDATABASE = 'oje_dev'
$env:PGUSER = 'postgres'
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/001_initial_schema.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/002_admin_sessions.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/003_order_idempotency_fingerprint.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/004_product_image_url.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/005_product_type_taxonomy.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/006_catalog_product_images.sql
```

PostgreSQL solicitará la contraseña interactivamente si no hay un mecanismo local configurado.

## Cargar datos de demostración

```powershell
psql -v ON_ERROR_STOP=1 -f backend/database/seeds/001_demo_data.sql
```

Los seeds son repetibles y usan fechas relativas para incluir órdenes en los últimos siete días. No crean cuentas administrativas ni contraseñas.

## Reiniciar la base de datos de desarrollo

Estos comandos eliminan y vuelven a crear la base completa. Confirma que `PGDATABASE` apunte únicamente a una base local descartable:

```powershell
dropdb --if-exists $env:PGDATABASE
createdb $env:PGDATABASE
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/001_initial_schema.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/002_admin_sessions.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/003_order_idempotency_fingerprint.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/004_product_image_url.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/005_product_type_taxonomy.sql
psql -v ON_ERROR_STOP=1 -f backend/database/migrations/006_catalog_product_images.sql
psql -v ON_ERROR_STOP=1 -f backend/database/seeds/001_demo_data.sql
```

## Configuración comercial y cobertura

`app_settings` centraliza el umbral inicial de envío gratis de ₡35 000 CRC y la restitución del uso del cupón al cancelar antes del envío mientras el cupón siga vigente. La aplicación deberá leer estos valores; no duplicarlos en frontend o servicios. El esquema conserva las redenciones revertidas como historial y permite una redención activa por cliente/cupón.

El esquema incluye roles/usuarios, categorías jerárquicas, productos y variantes, inventario, colecciones, ciudades, clientes/direcciones, cupones/redenciones, órdenes/artículos, eventos, auditoría y configuración. Los estados de producto usan `borrador`/`publicado`; las órdenes usan `pending_payment`, `paid`, `processing`, `shipped`, `delivered` y `cancelled`.

## API de catálogo

La API mantiene una sola fuente de stock: `inventory.on_hand` menos `inventory.reserved`, ligada uno a uno a cada variante. En JSON, `variants[].stock` representa la cantidad física editable (`on_hand`) y la respuesta calcula stock disponible como `on_hand - reserved`; no hay stock duplicado en productos o variantes. Las referencias históricas de órdenes o carritos impiden eliminar variantes relacionadas.

La migración `002_admin_sessions.sql` agrega sesiones administrativas revocables que guardan solo el hash del token de sesión. La migración `003_order_idempotency_fingerprint.sql` agrega la huella para rechazar reutilización inconsistente de claves de checkout. Las instrucciones para crear el usuario inicial sin una credencial predeterminada están en `../README.md`.

La migración inicial ya modela ciudades con `is_active` (cobertura) y `shipping_cost`, además de cupones y sus redenciones; no se requiere una migración adicional para esta fase. El endpoint de estimación lee el umbral comercial desde `app_settings`.

`005_product_type_taxonomy.sql` es una migración de datos idempotente: crea/actualiza las seis categorías compartidas y agrega los tipos canónicos a productos históricos clasificados como judogi, BJJ Gi o rashguard. Preserva el deporte BJJ al hacer global la categoría Cinturones. No agrega ni altera tablas o columnas. Aplicarla despues de `004` propaga la taxonomía a bases ya existentes; el seed sigue reservado para los datos de demostración.
## Imágenes de producto

La migración `004_product_image_url.sql` agrega el campo opcional `products.image_url`; aplícala después de las migraciones anteriores. No modifica filas ni seeds existentes, que continúan con `image_url` nulo.

El catálogo usa la raíz existente `uniformes` para seis tipos comunes (`kimonos`, `cinturones`, `conjuntos-entrenamiento`, `camisas`, `sudaderas`, `medias`); `judo` y `bjj` siguen como categorías de deporte. La semilla local incluye productos de demostración con variantes, `inventory` e ilustraciones originales en `frontend/public/catalog-art/`. Sus tallas, colores, precios y cantidades no son inventario comercial confirmado. No cargues la semilla en producción: al repetirla, actualiza los registros OJE de demostración. Reemplaza una ilustración desde el admin al cambiar `imageUrl` por una foto del propietario.

La migración `006_catalog_product_images.sql` habilita rutas locales `/catalog-art/` en la restricción SQL, asigna fotos a Prototipo Judogi, Judogi Competencia Azul, Judogi Entrenamiento Blanco, BJJ Gi Negro y Rashguard Tatami cuando aún conservan su ilustración demo, y completa las asociaciones de tipo/deporte de esos productos y el Cinturón BJJ Azul cuando faltan. Repetirla no sobrescribe imágenes elegidas posteriormente en el admin. La foto del cinturón negro con franja blanca se usa como ilustración general de la tarjeta Cinturones; las fichas azules y moradas siguen usando su arte por variante.
