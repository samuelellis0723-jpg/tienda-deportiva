# Referencia de arquitectura de interfaz

Fecha de revisión: 24 de octubre de 2026 (Costa Rica).

## Acceso y evidencia

La portada https://www.jabra.com/ falló en la herramienta web por bucle de redirecciones; `/en-us` tampoco fue accesible. Sí se pudo leer el documento HTML de [la familia de productos de oficina](https://www.jabra.com/business/office-headsets). Se observaron navegación principal por áreas, presentación de familia, bloques según contexto de uso, tarjetas con imagen/nombre/acción, variantes de color y enlaces de exploración, selección de modelos y footer por grupos. Esta lectura no permite afirmar dimensiones, comportamiento en móvil ni microinteracciones.

El navegador solicitado no estaba disponible y el inventario de navegadores conectados devolvió una lista vacía. No se observó visualmente el sitio en escritorio o móvil ni se obtuvieron capturas.

## Adaptación y distinción entre observado y propuesto

| Patrón | Evidencia | Adaptación OJE |
| --- | --- | --- |
| Navegación por grupos | Áreas principales presentes en HTML | Equipo desde categorías activas reales; acceso separado a guía de talla |
| Hero y CTA | Presentación de familia y acciones en HTML | Mensaje original «El camino se entrena» e ilustración SVG propia |
| Bloques de categorías | Agrupaciones por contexto de uso | Categorías reales, sin inventar taxonomías adicionales |
| Tarjetas de producto | Nombre, imagen, variantes y enlaces en HTML | Precio CRC, disponibilidad API y elección rápida de talla/color |
| Selección/comparación | Selector de familias/modelos en HTML | Selección por categoría y talla; no se inventan atributos técnicos para comparativas |
| Footer | Grupos de productos, ayuda y compra en HTML | Navegación real de tienda, ayuda y administración |
| Mega menú y móvil | Comportamiento no observado | Propuesta propia: disclosure desktop y drawer móvil con dialog nativo |
| Buscador | Comportamiento no observado | Propuesta propia: búsqueda diferida, sugerencias reales y acceso a catálogo |
| Ficha de producto | No se abrió una ficha de referencia | Patrón equivalente: compra sticky, variantes, especificaciones reales, zoom y acordeones |
| Sticky y microinteracciones | No observados | Propuesta propia: header sticky, feedback de carrito, drawer y skeletons |
| Cookies | Banner no observado | Aviso propio del uso real de almacenamiento, sin fingir analítica opcional |

No se descargaron ni reutilizaron activos, código o fuentes de Jabra. No se sostiene fidelidad visual a una página no inspeccionada visualmente.
