# Diagnostico: inventario por tipo de producto

## Estado previo revisado

- La base ya tiene `categories.parent_id`, `product_categories` muchos-a-muchos, `products.image_url` (migracion 004), variantes activas/inactivas y `inventory.on_hand`/`reserved`.
- El trabajo previo agrego clasificacion por deporte con raices `judo` y `bjj` y tipos historicos como `judo-gi`, `bjj-gi` y `rashguard`. El catalogo permite un producto para uno o ambos deportes.
- La politica existente en `backend/src/models/stockPolicy.js` calcula disponibilidad como `GREATEST(on_hand - reserved, 0)` y determina bajo/agota con la demanda de ventas pagadas en los siete dias. Alertas y API de producto ya consumen esa regla.
- `image_url` ya recorre el modelo y los formularios de admin. No se necesita una columna adicional.
- La semilla demo anterior solo cubria una parte de la variedad. No habia los seis tipos con varias referencias, recursos graficos por tipo ni resumen administrativo agrupado por tipo.
- `git status --short` al inicio mostro cambios preexistentes amplios de los gauntlets anteriores y archivos de documentacion sin seguimiento. Se conservaron todos; no se limpiaron ni se crearon commits.

## Decision de modelado

Los seis tipos comunes cuelgan de la raiz ya existente `uniformes`, mientras Judo/BJJ permanecen como etiquetas de deporte independientes. `product_categories` permite combinar un tipo con uno o ambos deportes. Se mantienen legibles las categorias historicas bajo las raices deportivas y se normalizan sus alias solo al mostrar/filtrar.

Se descarto una columna `product_type`, una tabla paralela de tipos y una raiz separada por deporte: duplicarian la relacion de categorias, harian mas dificil el cruce Judo/BJJ y requeririan cambios no necesarios al esquema. No se crea migracion; el esquema actual soporta el catalogo.

El frontend obtiene los nombres y conteos publicos desde PostgreSQL por `GET /api/productos/tipos`; no conserva listas ni conteos de productos duplicados. El dashboard lee `inventoryByType` del resumen administrativo. Stock y filtros permanecen en las tablas/servicios existentes.

## Ambiguedades resueltas

- Las tallas y colores de las filas seed son muestras marcadas como demostracion, no afirmaciones sobre el inventario comercial real.
- Los productos de medias se presentan como merchandising OJE sin inventar materiales o atributos.
- SVG locales hechos para esta interfaz son provisionales; el admin puede sustituirlos por fotografia autorizada mediante `imageUrl`.

## Alcance de verificacion

La migracion `005_product_type_taxonomy.sql` propaga la taxonomia a bases ya existentes; solo la semilla demo agrega productos de muestra. Pruebas automatizadas usan PostgreSQL simulado. No se ejecutaron migracion o seed contra PostgreSQL real y no se declara verificacion real admin -> PostgreSQL -> tienda/dashboard. La bitacora registra los resultados automatizados, visuales y las limitaciones.
