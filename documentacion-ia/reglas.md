# Reglas de Desarrollo en React: Estructura, Componentes y Hooks

---

## Reglas sobre Estructura y Organización

Estas reglas definen cómo ordenar los archivos y las responsabilidades para mantener el proyecto limpio.

### 1. Jerarquía de Construcción
La aplicación debe construirse siguiendo una jerarquía estricta que refleje su composición:

Componentes -> Páginas -> Rutas -> App -> main.jsx

1. Los **Componentes** reutilizables forman las **Páginas**.
2. Las **Páginas** se definen como **Rutas**.
3. Las **Rutas** se declaran en **App**.
4. **App** se monta en el punto de entrada **`main.jsx`**.

> Este flujo previene dependencias circulares y aclara el rol de cada parte del proyecto.

---

### 2. Organización por Características (Feature-Based)
Para proyectos que crecen, es mejor organizar el código por **características o dominios de negocio** (ej. `auth`, `dashboard`, `products`) en lugar de hacerlo por tipo de archivo (ej. `components`, `hooks`, `pages`). 

* **Ventajas:** Código más autónomo, fácil de entender y de mantener, ya que todo lo relacionado con una característica está centralizado en un solo lugar.

---

### 3. Colocación (Co-location)
Todo lo que esté relacionado a un componente debe vivir dentro de su misma carpeta:
* Estilos
* Pruebas (Tests)
* Historias de Storybook
* Tipos de TypeScript

Simplifica el mantenimiento y evita buscar archivos dispersos en múltiples lugares.

---

### 4. Nomenclatura Clara

* **Archivos y carpetas:** Usa `kebab-case` (`mi-componente.jsx`) para evitar problemas de compatibilidad entre sistemas operativos.
* **Componentes:** Usa `PascalCase` (`MiComponente`) para el nombre de la función (obligatorio para que React los reconozca).

---

### 5. Evitar Anidaciones Profundas
Limita la profundidad de las carpetas a un **máximo de 2 o 3 niveles**. Una estructura demasiado profunda vuelve las importaciones confusas y dificulta la navegación.

```text
// Bueno 
features/dashboard/components/StatsCard.jsx 

// Malo 
src/components/features/dashboard/views/cards/stats/StatsCard.jsx 
```

---

### 6. Usar Importaciones Absolutas
Configura `jsconfig.json` o `tsconfig.json` para usar importaciones absolutas:

```javascript
// Recomendado
import { Button } from '@components/ui/Button';

// Evitar
import { Button } from '../../../components/Button';
```

---

## Reglas sobre Componentes y Lógica

Estas reglas se centran en cómo deben escribirse los componentes y gestionarse la lógica para que sean predecibles y robustos.

### 1. Pureza de Componentes y Hooks
Esta es una regla fundamental de React:

* **Idempotencia:** Un componente debe devolver siempre el mismo resultado para las mismas `props`, `state` y contexto.
* **Sin Efectos Secundarios en el Renderizado:** No ejecutes llamadas a API, mutaciones o suscripciones directamente en el cuerpo del componente. Estas deben ir en `useEffect` o en manejadores de eventos.
* **Inmutabilidad:** Nunca modifiques directamente las `props` o el `state`. Usa las funciones de actualización (ej. `setState`) para crear nuevos objetos.

---

### 2. Principio de Responsabilidad Única (SRP)
Cada componente debe tener una sola responsabilidad bien definida. 

> **Regla importante:** Si un componente supera las **~200 líneas**, es señal de que debes dividirlo en subcomponentes más pequeños.  
> *Ejemplo:* Un `UserProfile` grande se puede dividir en `ProfilePicture`, `UserName` y `UserBio`.

---

### 3. Hooks Personalizados para Lógica Reutilizable
Si varios componentes comparten una misma lógica (como la obtención de datos o la gestión de un formulario), extráela a un **Hook personalizado**. Esto mantiene los componentes limpios y la lógica reutilizable y testeable.

---

### 4. Un Solo Elemento Raíz
Cada componente debe retornar un solo elemento JSX raíz. Puedes usar Fragments (`<></>`) para agrupar múltiples elementos sin añadir nodos extra al DOM.

---

## Reglas sobre el Uso de Hooks

Estas reglas son **obligatorias** (no opcionales), ya que aseguran que React pueda gestionar el estado de los Hooks correctamente entre renders.

1. **Solo Llamar Hooks en el Nivel Superior:**  
   No llames hooks dentro de bucles, condicionales o funciones anidadas. Los hooks deben ejecutarse exactamente en el mismo orden en cada renderizado del componente.

2. **Solo Llamar Hooks desde Funciones de React:**  
   Los hooks solo pueden ser llamados desde:
   * Componentes funcionales de React.
   * Otros hooks personalizados.  

   *Nunca los llames desde funciones de JavaScript convencionales.*