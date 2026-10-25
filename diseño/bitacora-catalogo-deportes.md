# Bitacora adversarial: catalogo por deporte

## Primera ronda

- Hallazgo: cambiar a otro deporte podia conservar una categoria hija del deporte anterior. Corregido en `CatalogPage`: elimina la faceta incompatible junto con el tipo y reinicia la pagina.
- Hallazgo: el inicio tenia accesos por deporte, pero no estantes de productos por deporte. Corregido: se consultan productos publicados por los tipos conocidos de uniforme Judo Gi, BJJ Gi y rashguard; cinturones y otros accesorios no se presentan como uniformes.
- Hallazgo: el backend permitia combinar `deporte=judo` con `tipo=bjj-gi`. Corregido: la API responde 400 cuando el tipo no es hijo directo del deporte elegido; hay prueba de contrato.
- Hallazgo: categorias activas bajo un padre inactivo podian seguir apareciendo en el catalogo. Corregido: el listado publico y la proyeccion publica de categorias ignoran ramas con ancestros inactivos. Admin conserva acceso a relaciones inactivas.
- Revision estatica: filtros `deporte` y `tipo` usan `EXISTS`, mantienen una fila por producto y el conteo comparte condiciones. Rutas publicas siguen limitadas a publicados.
- Revision 2: se limito el filtro combinado a tipos cuyo padre coincide con el deporte y se amplió el limpiado de categoria al cambiar de deporte para incluir tambien la raiz anterior. Los estantes de Inicio ahora consultan todas las subcategorias activas del deporte, sin lista de tipos codificada en el componente.
- Revision 3: una segunda auditoria encontro rutas directas a subcategorias bajo padres inactivos. Se propago la validacion de ancestros a la lectura publica por ID, la resolucion del filtro `categoria` y el `EXISTS` de productos. El acceso admin mantiene la opcion de incluir categorias inactivas y filtrarlas (cubierto por contrato HTTP).
- Datos: las categorias nuevas de rashguard y cinturones se agregaron al seed repetible. No se ejecuto el seed ni se escribio en la base de datos.

## Limites conocidos

- La jerarquia de la interfaz trata los hijos directos de Judo/BJJ como tipos. No se ha definido una taxonomia de profundidad ilimitada ni una categoria de kit no-gi.
- Productos existentes sin clasificacion se preservan y se identifican como pendientes de confirmar. No se infieren deportes por nombre o descripcion.
- La revision fue estatica y automatizada. No se verifico el flujo autenticado del admin en navegador ni el aspecto visual en 360, 768 y 1280 px.
- El seed contiene fixtures comerciales de demostracion preexistentes; no se toman como especificaciones confirmadas de producto.
