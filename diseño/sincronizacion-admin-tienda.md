# Entrega: sincronización, fechas, disponibilidad y navegación

## Implementación y decisiones

### Fuente de verdad y frescura

Tienda y admin consultan la misma API respaldada por PostgreSQL. Inicio permite recorrer productos publicados en páginas de cuatro, ordenados por fecha efectiva; catálogo pagina doce por página. Publicar no necesita cambios de código ni una lista fija de destacados. Al eliminar/despublicar, las siguientes lecturas retiran la tarjeta; la ficha pública responde 404 controlado. Las páginas fuera de rango se ajustan sin perder filtros.

No hay caché de datos adicional ni dependencia nueva. Frontend consulta con `cache: no-store` y la API responde `Cache-Control: no-store`. Se vuelve a consultar al entrar/cambiar ruta o filtros, recuperar foco/visibilidad y recibir señal del admin. Guardar, publicar, despublicar y eliminar emiten un evento local y una marca sin datos del negocio en localStorage para las otras pestañas del mismo origen. Entre dispositivos u orígenes distintos el refresco ocurre al navegar o recuperar foco; no se promete tiempo real.

Lecturas públicas no dependen de la cookie admin y sólo proyectan publicados y relaciones activas. Admin utiliza `estado` en listado y `vista=admin` en detalle, con sesión. Se retiró stock físico/flags internos de las respuestas públicas; se conserva el campo editable `stock` sólo para admin, respaldado por `inventory.on_hand`.

### Fechas y ventana «Nuevo»

Se usan `published_at`, `created_at` y `updated_at` existentes. No hay migración nueva ni modificación de 001–004. `reciente` ordena por publicación con fallback de creación y desempate por ID; el orden de creación explícito sigue disponible. Repetir publicar conserva la fecha; despublicar/republicar sigue las restricciones existentes y genera una fecha de nueva publicación.

Tarjetas, ficha y admin presentan fechas con `Intl.DateTimeFormat('es-CR', timeZone: 'America/Costa_Rica')`; `<time>` conserva el instante ISO. Fecha nula/inválida muestra «Fecha no disponible». La ventana de Nuevo es configurable sólo en `frontend/src/utils/product-date.js` mediante `NEW_PRODUCT_WINDOW_DAYS`, inicialmente 14 días exactos. Fechas futuras y el límite expirado no llevan insignia.

### Una política de inventario

Se preservó la regla encontrada, sin incorporar un umbral fijo inventado. `backend/src/models/stockPolicy.js` centraliza periodo, ventas elegibles, disponibilidad y predicados compartidos por catálogo/alertas. Cada variante responde con `availableStock`, `lowStockThreshold` y `stockStatus`.

- Disponibilidad: `max(on_hand - reserved, 0)`, cero si no hay fila de inventario.
- Agotado: disponibilidad cero.
- Bajo: disponibilidad positiva que no cubre las unidades vendidas durante los últimos siete días, en órdenes con venta no canceladas.
- Suficiente: resto de variantes con stock positivo. Sin ventas y con una unidad no se anuncia escasez sin evidencia.

React muestra el estado de la API, sin recalcular demanda. Catálogo/ficha/carrito/admin informan cantidades por variante y texto explícito para stock bajo/agotado; las señales no dependen sólo de color. Admin filtra publicados bajos/agotados con la misma regla y total paginado coherente, ordena fechas en servidor y permite acceder a alertas.

Carrito revalida al navegar, volver a enfocar y recibir cambios, y antes de una orden nueva. Ajusta cantidades al disponible, actualiza precios y explica retiradas por agotamiento/despublicación/variante inaccesible. Una avería de red o respuesta incompleta conserva los artículos y bloquea la creación hasta verificarlos. Si cambian precio/cantidad durante la comprobación, pide revisar el resumen. Express sigue validando y reservando de forma definitiva en su transacción. No se reescribe un intento idempotente incierto: mantiene payload y clave.

### Volver al inicio sin perder el formulario

StoreLayout incluye un enlace explícito de React Router para todas las páginas públicas distintas del inicio, incluidas carga/error, 404 y confirmación. El login también ofrece regreso al inicio. El topbar de admin mantiene otro enlace visible, incluso en móvil o con sidebar contraído. Objetivos mínimos de 44 px y foco compartido.

Contacto, dirección y código de cupón de checkout viven en OrderContext, por encima de las rutas: se conservan al ir al inicio y regresar. No se persisten datos personales en almacenamiento. Sólo se limpian al confirmar una orden. La protección existente de intentos inciertos y el aviso antes de una recarga se mantienen. Una recarga forzada sigue perdiendo el estado en memoria.

## Comprobaciones y límites

Las rondas y correcciones están en `bitacora-sincronizacion.md`. Checks finales: frontend `npm test` 19/19 y `npm run build` correcto (92 módulos); backend `npm test` 6/6 y `npm run check` correcto. `git diff --check` no reportó errores de whitespace. No existe `n8n/package.json` ni suite n8n en este repositorio.

Lectura real local: inicio/catálogo HTTP 200; health HTTP 200; catálogo con seis publicados y ocho variantes, fechas presentes, `stock` físico ausente y `Cache-Control: no-store`. Las variantes observadas estaban en estado `available`; estados bajo/agotado y límites se verifican mediante pruebas con datos controlados y revisión de las consultas. Producto inexistente devuelve 404 y listado de borradores sin sesión devuelve 401.

No se alteró la base real para probar operaciones. Las pruebas de escritura y concurrencia existentes utilizan PostgreSQL simulado. No se afirma una compra real ni una prueba administrativa autenticada contra la base existente. La verificación visual a 360/768/1280 y el recorrido con teclado/lector reales quedan pendientes: no hay navegador conectado disponible.
