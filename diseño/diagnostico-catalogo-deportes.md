# Diagnóstico: catálogo por deporte y tipo de uniforme

## Estado del repositorio antes de implementar

Se revisaron `README.md`, `diseño/DESIGN.md`, `diseño/decisiones.md`, `documentacion-ia/CONTRATOS_API.md`, `documentacion-ia/reglas.md`, `n8n/README.md`, el workflow exportado, migraciones 001–004, el seed demo y los modelos/rutas/pantallas de catálogo. `git status --short` mostró cambios preexistentes sin staged; todos se conservaron. No se abrió ningún archivo `.env`.

## Modelo y catálogo actuales

- `categories` tiene `parent_id`, `slug`, `name`, `description` e `is_active`. `product_categories` asocia productos y categorías muchos-a-muchos. Productos no tiene campos `deporte` ni `tipo`.
- Las migraciones disponibles son 001–004; no se encontró una posterior. `001` ya admite jerarquía y asociaciones múltiples. Inventario permanece por variante y no interviene en esta dimensión.
- El seed crea categorías raíz `judo`, `bjj`, `uniformes` y `proteccion`; incluye `judo-gi` bajo Judo y `bjj-gi` bajo BJJ. Hay cinco productos publicados y un borrador: dos judogis, un gi de BJJ, una rashguard, un cinturón BJJ y un prototipo de judogi. No hay un ejemplo asignado a ambos deportes ni registros no-gi completos, infantiles, de parches o bolsos.
- El README aclara que migraciones y seeds no se han ejecutado contra PostgreSQL en este entorno. Los ejemplos de seed no verifican por sí solos que afirmaciones de competencia, tela o refuerzos sean datos comerciales confirmados.
- `GET /api/productos` implementa `categoria` exacta, búsqueda, disponibilidad, orden y paginación; no implementa `deporte` o `tipo`. La lectura pública se limita a publicados. Las categorías pueden leerse como una lista plana.
- El formulario de admin permite seleccionar varias categorías, pero no presenta deporte y tipo como asignaciones diferenciadas. La tabla aún no filtra por deporte. El catálogo sincroniza sus filtros actuales con URL (`q`, `categoria`, `disponible`, `ordenar`, `page`); back/forward y enlaces funcionan para esos parámetros. Los filtros nuevos requerirán conservar ese mismo patrón.
- El header deriva el menú de categorías. Inicio muestra categorías, no bloques explícitos Judo/BJJ. Tarjeta y ficha muestran categorías, y la ficha obtiene relacionados a partir de una sola categoría.
- n8n recomienda desde productos publicados/disponibles usando categorías existentes; su resultado se valida contra el catálogo recibido. La acción de descripción acepta categoría textual y características. No necesita acceso directo al esquema. Si cambian los datos enviados a descripción o la forma de categorías, habrá que actualizar el contrato y pruebas correspondientes.

## Decisión adoptada para esta implementación

Se reutiliza `categories` como jerarquía deporte → tipo. `judo` y `bjj` son los deportes canónicos; un producto puede relacionarse con ambas categorías raíz y con una categoría hija de tipo. La API añade `deportes` y `tipoProducto` como proyecciones derivadas, y acepta filtros `deporte` y `tipo`. Las condiciones usan `EXISTS`, por lo que un producto compartido no se repite ni altera el total. No se requiere migración ni se duplica el estado de inventario.

La alternativa de agregar tablas `sports/product_sports` y tipo estructurado tendría una separación más explícita, pero requiere migración y backfill. Se descarta para este alcance porque la jerarquía/muchos-a-muchos existentes resuelven el caso con menor cambio. Un arreglo/texto libre también se descarta por falta de referencias y validación relacional.

Productos existentes sin deporte o tipo se muestran en admin como «Sin deporte asignado» / «Sin tipo asignado» y en la tienda como «Deporte por confirmar». Se conservan al editar otros campos; al modificar su clasificación deben elegir deporte(s) y exactamente un tipo. Productos nuevos requieren ambas asignaciones. No se asigna deporte automáticamente por nombre o descripción.

## Alcance de cambios

La solicitud explícita de organizar el catálogo, asignar deportes/tipos y filtrar por ambos queda implementada con el alcance menor que admite el esquema actual: se actualiza el seed repetible y se amplía de forma aditiva el contrato de catálogo, sin migración. No se leen `.env`, no se ejecuta el seed contra la base existente y no se modifica checkout/inventario.
