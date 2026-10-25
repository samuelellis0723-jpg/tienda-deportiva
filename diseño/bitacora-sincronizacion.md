# Bitácora: sincronización admin → tienda

## Reconocimiento y diagnóstico

Se registró el flujo antes de editar en `diagnostico-sincronizacion.md`. Se conservaron los cambios previos del rediseño y los documentos nuevos del usuario; no había cambios staged al comenzar. No se leyeron archivos de entorno. Se verificaron rutas, servicios, consultas de inventario y migraciones 001–004.

## Ronda 1 — construcción y revisión adversarial

Implementados: lecturas públicas separadas de admin, fechas/orden reciente, política de reposición compartida, respuesta de stock por variante, caché desactivada, refresco por navegación/foco/eventos, revalidación del carrito, borrador de checkout persistente en memoria y enlaces al inicio. Primer resultado frontend: 18/18 pruebas y build correcto; backend: 6/6 y check correcto.

El árbitro encontró:

1. `stockBajo=true` combinado con el estado inicial borrador dejaba la tabla vacía. Corregido: el filtro fuerza publicado, también al entrar por URL/historial; elegir borrador desactiva stock bajo.
2. Retirar el último producto de una página del catálogo podía dejar una página fuera de rango sin navegación. Corregido: ajuste a la última página válida conservando filtros. Inicio paginado aplica el mismo principio.
3. Recomendaciones del carrito sólo dependían de sus artículos. Un producto recomendado podía despublicarse y quedar en memoria. Corregido: también se refrescan por foco/visibilidad y señales administrativas.

Revisión del constructor: la publicación repetida conservó fechas mediante comprobación del estado previo; los inputs de admin usan stock físico exclusivamente para edición y disponibilidad exclusivamente para informar, sin mezclar ambos.

## Ronda 2 — integridad de revalidación y navegación

El árbitro confirmó las tres correcciones y no halló nuevas fugas públicas, cálculos de demanda duplicados o rupturas del intento idempotente. Comprobó por código que la reconciliación usa los artículos actuales, compara el payload tras la consulta y deja intactos los intentos pendientes/inciertos.

Señaló que el enlace al ancla de reposición podía abrir el dashboard antes de que existiera la sección asíncrona. Corregido: después de cargar, el dashboard desplaza y enfoca la sección solicitada. El periodo mostrado procede ahora del metadato de la API.

Revisión adicional del constructor: un HTTP exitoso con producto incompleto no debe tratarse como producto eliminado. `getProduct` valida el contrato y produce error recuperable; se añadió regresión. La cantidad elegida en ficha se conserva mientras se refresca y se acota al stock al terminar.

## Ronda 3 — cierre por código

El árbitro no encontró una nueva razón para rechazar el código revisado. Confirmó el ancla, la validación de respuesta y la conservación de cantidad. Checks finales: frontend 19/19 y build de producción correcto (92 módulos); backend 6/6 y verificación de sintaxis correcta. `git diff --check` limpio.

No hay aprobación visual ni prueba de navegación con teclado real: el inventario de navegadores conectados devolvió `[]`. No se generaron capturas de 360, 768 o 1280 px. No se crearon órdenes ni se modificaron productos o inventario contra la base real para probar.
