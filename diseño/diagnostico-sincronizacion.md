# Diagnóstico: admin, catálogo y disponibilidad

## Estado antes de corregir

El 24 de octubre de 2026 se revisaron README, sistema visual, documentación de productos/inventario/alertas y migraciones 001–004. El árbol conserva los cambios del rediseño anterior y documentos nuevos del usuario. `git status` no mostró archivos staged. No se abrieron archivos de entorno.

## Flujo existente

- Admin crea mediante `POST /api/productos` y edita mediante `PATCH /api/productos/:id`. Crear genera borrador; la acción `POST /:id/publicar` comprueba precio y variante activa con inventario. Despublicar cambia a borrador. El inventario se escribe exclusivamente en `inventory`.
- Inicio consulta los cuatro productos más recientes y catálogo pagina el mismo `GET /api/productos`. No hay un catálogo fijo de ejemplo en React. El orden reciente actual usa `created_at`; existen también `published_at` y `updated_at` en PostgreSQL.
- Las páginas cargan al montarse o cambiar filtros/ruta. No hay librería de caché, invalidación después de guardar ni recarga al recuperar foco. Los endpoints no fijan una política de caché explícita.
- El detalle utiliza autenticación opcional: la misma lectura puede devolver un borrador si hay sesión admin. La selección SQL también incluye `stock` físico en respuestas públicas. Debe distinguirse explícitamente lectura pública y administrativa.
- El carrito guarda snapshots de precio y disponibilidad. No consulta si el producto cambió, se agotó o se despublicó antes de comprar. El servidor sí vuelve a comprobar todo al crear la orden.
- No se muestran fechas en tarjetas/admin. Los botones para volver al inicio no están presentes de forma explícita en todas las pantallas y el formulario checkout vive en una página desmontable.

## Regla de reposición encontrada

No existe un umbral fijo global de pocas unidades. `metricsModel.getReplenishmentAlerts` alerta por variante activa/publicada si la disponibilidad es cero o no cubre las unidades vendidas durante los últimos siete días (órdenes con venta y no canceladas). Sin ventas y con existencia positiva no alerta. Disponibilidad = `GREATEST(COALESCE(on_hand,0) - COALESCE(reserved,0),0)`.

Se conservará esa regla, centralizando sus expresiones y periodo en backend. La API entregará el umbral y estado por variante; React presentará el resultado sin recrear el cálculo de demanda. No se agregarán tablas, columnas ni migraciones. La ventana de «Nuevo» se definirá en un único módulo de presentación.

## Estrategia prevista

Lecturas públicas explícitas y sin caché HTTP; recarga al navegar, al recuperar foco/visibilidad y al recibir señal de cambios administrativos entre pestañas del mismo origen. Revalidación de artículos del carrito con retirada de productos inaccesibles y ajuste de cantidades antes de enviar una nueva orden. Los intentos idempotentes pendientes conservan su snapshot. Los datos escritos del checkout se conservan en memoria al navegar. Sin dependencias nuevas ni websockets.
