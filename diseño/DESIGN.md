# Sistema visual OJE

## Dirección vigente

Identidad deportiva y técnica para Judo/BJJ en Costa Rica. Fondo mineral claro, superficies blancas, verde tinta y rojo para acentos. El inicio alterna una portada oscura, categorías, productos, guía de ajuste y manifiesto. Ilustración vectorial original: no se usan activos, textos, fuentes ni código de Jabra.

## Fuente de los tokens

`frontend/src/assets/styles/variables.css` centraliza colores, escala tipográfica, espacios de 4 px, radios, sombras, niveles de superposición, tiempos y curvas. Los controles tienen un objetivo mínimo de 44 px. La fuente de interfaz usa la pila del sistema Arial/Helvetica/sans-serif y el acento editorial Georgia/Times/serif; no se distribuyen archivos tipográficos ni se cargan fuentes externas.

- Papel `#f5f4ef`, superficie `#ffffff`, texto `#1c2422`, secundario `#5d6661`.
- Verde `#253d34`, rojo `#a62c20`, texto sobre oscuro `#f5f4ef`.
- Borde decorativo `#d5d9d2`; borde de controles `#7b857d`. El borde decorativo no identifica por sí solo un input.
- Escala de texto: 12, 14, 16, 20, 24, 32 px y tokens display con interpolación según viewport.
- Breakpoints: móvil 600/620 px según layout/formulario, navegación 800 px, densidad 1000/1100 px. Admin: sidebar móvil hasta 760 px, columnas hasta 1100 px. Las media queries conservan literales porque las custom properties no son válidas como condiciones nativas; el inventario anterior documenta sus usos.
- Animación corta 180 ms, drawer 350 ms, pulso skeleton 1.2 s. `prefers-reduced-motion` desactiva movimientos y transiciones prolongadas.

## Componentes y estados

`global.css` define botones primarios/secundarios/acento y estados hover, active, disabled y foco; campos, selectores, checkbox/radio nativos; avisos de error/éxito; breadcrumbs, vacíos, skeletons y paginación. `Overlay.jsx` usa dialog nativo con foco confinado, Escape, restauración de foco y scroll bloqueado. Drawer reutiliza ese mecanismo. `Tabs.jsx` incluye flechas, Inicio/Fin y relaciones tab/panel. `Toast.jsx` anuncia el agregado y permite cierre manual. Las tablas admin incluyen encabezados de orden, regiones desplazables enfocables y estados de carga/vacío/error.

Las imágenes de producto provienen de `imageUrl`. Ante ausencia/error se muestra una composición editorial OJE identificada como ilustrativa, nunca una foto inventada. Se declaran dimensiones y carga diferida. La ficha permite ampliar la única imagen disponible; no simula vistas adicionales.

## Contenido y comercio

Categorías, productos, precios, variantes y disponibilidad vienen de servicios existentes. Solo se renderizan productos `publicado`. La disponibilidad es el valor calculado por API desde `inventory.on_hand - reserved`; si se recibe inventario explícito, se resta y acota a cero. El umbral de envío gratis se obtiene de una cotización real, nunca se codifica en la interfaz.

Los enlaces de ayuda tienen rutas reales. No se publicaron teléfonos, redes, plazos de entrega, certificados de competencia ni políticas de devolución sin respaldo. La guía de medidas orienta sin inventar una tabla universal de tallas.

## Accesibilidad: evidencia y límite

Las parejas de texto, botones y bordes de controles se calculan en `scripts/check-contrast.mjs`; el informe real se registra en la bitácora. El foco combina un anillo oscuro con halo blanco para fondos claros/oscuros. Esto no certifica WCAG 2.2 AA global: falta recorrer teclado, lector de pantalla y los cuatro viewports en navegador. Tampoco se atribuye una puntuación Lighthouse sin medición.

## Fechas, stock y navegación del catálogo

Las tarjetas incluyen fecha de publicación/creación y badge Nuevo. Cada variante tiene una señal textual con unidades: disponible, pocas unidades o agotado; el color acompaña al mensaje. StockStatus presenta el estado enviado por backend y no aplica un umbral comercial propio. Las señales de stock bajo usan los tokens existentes error/error-bg y las insignias Nuevo usan success/success-bg, con contraste ya medido.

El enlace «Volver al inicio» ocupa un área de al menos 44 px después del header en todas las páginas públicas secundarias y en el topbar administrativo. El checkout conserva el borrador al navegar. Los cambios automáticos del carrito se anuncian con un aviso visible y cierre explícito. Decisiones y verificación de esta ampliación: `sincronizacion-admin-tienda.md`.

La tienda expone Judo y BJJ como accesos, filtros URL y badges derivados de la jerarquía de categorías existente. Categorías hijas de esas disciplinas representan tipos de producto; asociaciones múltiples permiten clasificar un artículo para ambas. Productos previos sin clasificación muestran «Deporte por confirmar» en tienda y «Sin asignar» en admin. La ficha enlaza relacionados del mismo deporte y presenta tallas reales sin completar medidas no cargadas. Diagnóstico y contrato en `diagnostico-catalogo-deportes.md` y `documentacion-ia/CONTRATOS_API.md`.

El catálogo de producto común usa seis categorías bajo la raíz existente `uniformes`: kimonos, cinturones, conjuntos de entrenamiento, camisas, sudaderas y medias OJE. Cada tipo tiene SVG local original con paleta y encuadre compartidos; variantes de color pertinentes tienen ilustraciones locales propias. Son arte provisional, no fotografías de producto; se sustituyen desde el admin al copiar una foto autorizada a `frontend/public/catalog-art/` y guardar esa ruta en `imageUrl`. La API y el frontend bloquean recursos de imagen externos. Tienda, formularios y tablas administrativas cargan ilustraciones del mismo catálogo local como respaldo cuando falta o falla la imagen. Todas declaran dimensiones y carga diferida. Los datos de talla, color y stock del seed están identificados como demostración. Diagnóstico y decisiones: `diagnostico-inventario-tipos.md` y `bitacora-inventario-tipos.md`.
