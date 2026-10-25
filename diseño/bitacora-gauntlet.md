# Bitácora Gauntlet

Fecha: 24 de octubre de 2026, Costa Rica.

## Reconocimiento

Leídos prompt, README, diseño vigente, las cuatro guías de documentacion-ia y contratos/código real. Estado inicial: dos documentos sin seguimiento del usuario, sin staged. Se conserva todo, no se abren archivos de entorno ni se hacen commits. Referencia accesible parcialmente por HTML; sin observación visual.

## Ronda 1 — base, tienda y panel

Construido sistema de tokens, navegación, inicio, catálogo, ficha, ayuda y panel. Build inicial y dos pruebas existentes pasaron. El árbitro encontró:

- Edición de carrito durante creación y cupón obsoleto al cambiar artículos.
- Cantidades fraccionarias incompatibles con contrato.
- Sugerencias de búsqueda anteriores durante consulta nueva.
- Escape en el botón de categorías no cerraba menú.
- Borde de input y foco en fondo oscuro con contraste insuficiente.
- Falta de estimación/cupón en carrito.

Correcciones: bloqueo global del carrito, firmas de consultas de cupón, cantidades enteras acotadas también al leer persistencia, limpieza de sugerencias, cierre por Escape/foco externo, borde de controles separado y foco doble; CartEstimate conectado al mismo servicio de cupón/envío.

Admin: duplicación de encabezados de modal, confirmación antigua y lectura de solo primeros 100 productos corregidas; paginación servidor, diálogos nativos, confirmaciones destructivas y preview con error. Segunda revisión eliminó CSS acumulado y colores fuera de tokens, hizo tablas enfocables y añadió despublicación múltiple con confirmación.

## Ronda 2 — reintentos y navegación

El árbitro detectó que desmontar checkout al navegar perdía su clave y que editar después de error de red podía crear otro intento. Se centralizó intento/payload/resultado en OrderContext persistente, con bloqueo hasta resolver respuesta incierta y reintento del mismo snapshot. Banner permite volver al checkout desde cualquier ruta. Aviso beforeunload protege frente a salida accidental. No se persiste PII en navegador. Recarga forzada sigue siendo una limitación documentada.

Borde de variantes/selectores/cantidades cubierto al final de store.css. Nueva medición: los 15 pares evaluados pasan; el borde de controles alcanza 3.82:1 sobre blanco y 3.47:1 sobre papel. Texto secundario/papel 5.39:1. Es cálculo de tokens, no certificación de todos los estados.

## Ronda 3 — integridad de confirmación

El árbitro confirmó conservación del intento durante navegación, snapshot en reintento y corrección de bordes. Encontró que un HTTP exitoso con JSON incompleto podía vaciar carrito sin una orden válida. Corregido en order-service: exige identificador y total finito; de lo contrario genera respuesta incierta y conserva carrito/clave. Prueba específica añadida. Al volver durante una solicitud se muestran nombre, correo, dirección y artículos del intento enviado, en lugar de campos vacíos deshabilitados.

Revisión propia adicional: click en padding interior de un diálogo ya no se interpreta como click del backdrop. El proceso dev evita el error de permisos al bundlear vite.config; pruebas SSR desactivan su WebSocket para evitar advertencias por puertos compartidos.

## Evidencia de integración de lectura

Vite responde HTTP 200 en inicio y catálogo. A través de los proxies existentes: `/api/health`, `/api/categorias` y `/api/productos?limit=1` respondieron 200; el último indicó total de 5 productos en esa consulta. El webhook `cities` devolvió `ok:true` con 6 ciudades y `coverage` devolvió `ok:true`, cobertura y umbral configurado. No se crearon órdenes de prueba ni se tocaron pagos o datos administrativos reales. No se verificó procedencia/contenido de PostgreSQL, migraciones o generación IA en producción.

## Criterios sin aprobación

| Criterio | Resultado |
| --- | --- |
| Visual 360 px | Pendiente: no hay navegador conectado |
| Visual 768 px | Pendiente: no hay navegador conectado |
| Visual 1280 px | Pendiente: no hay navegador conectado |
| Visual 1920 px | Pendiente: no hay navegador conectado |
| Lighthouse móvil inicio/catálogo/detalle | Sin medir; no se atribuyen puntuaciones |
| Teclado y lector de pantalla en ejecución | Pendiente; revisión semántica y de código únicamente |
| Recorrido admin autenticado | Pendiente; no se dispone de sesión de prueba autorizada |
| Compra completa y reserva PostgreSQL | No ejecutada |
| Contacto/redes/política de cambios/tabla exacta por modelo | No existen datos reales suficientes; no se inventaron |

No se declara aprobación total del Gauntlet ni certificación WCAG/Lighthouse: faltan las verificaciones anteriores. Los resultados finales de comandos y archivos se registran en entrega-gauntlet.md.

## Cierre de revisión por código

El árbitro revisó las últimas correcciones, ejecutó npm test (10/10) y no encontró errores críticos nuevos en el código examinado. La coordinación de intentos se extrajo a `order-attempt.js`: clona el payload y comparte la solicitud concurrente; tiene pruebas de pérdida de conexión, inmutabilidad y rechazo definitivo. Se añadió navegación lateral contraíble también en escritorio.

Últimos comandos: frontend `npm test` 10/10, `npm run build` correcto (85 módulos, sin advertencias), `git diff --check` correcto. Workflow n8n: 6/6 pruebas. Contraste: 15/15 pares. Preview HTTP comprobado y detenido al terminar; se puede volver a iniciar con `npm run dev` desde frontend. No hay aprobación total mientras falten los criterios visuales y de integración indicados.
