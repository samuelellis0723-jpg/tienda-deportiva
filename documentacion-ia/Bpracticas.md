# Guía Práctica de Buenas Prácticas de Programación (JavaScript & React)

Esta guía sirve como una plantilla de referencia y lista de verificación (checklist) interactiva para utilizar durante el ciclo de vida del desarrollo de cualquier sitio o aplicación web. Su objetivo es asegurar que el código resultante sea legible, mantenible, escalable y consistente.

---

## 📌 1. Nomenclatura y Convenciones de Estilo

El nombre correcto de una variable ahorra un comentario y previene bugs. Utiliza las siguientes reglas y convenciones de escritura:

### Reglas de Oro para Nombrar
- [ ] **Revela la intención:** Usa nombres descriptivos que expliquen para qué sirve la variable (ej. `userCount` en lugar de `x` o `n`).
- [ ] **Pronunciable y buscable:** Evita abreviaciones crípticas difíciles de buscar en el editor.
- [ ] **Sin datos de tipo pegados:** Prefiere `users` en lugar de `arrUsers`.
- [ ] **Booleanos afirmativos:** Define estados en positivo (ej. `isActive`, `hasPermission` en lugar de `isNotDisabled`).
- [ ] **Funciones = Verbos:** El nombre de una función debe iniciar con un verbo de acción (ej. `getUser()`, `calcTotal()`).
- [ ] **Clases y Componentes = Sustantivos:** Las entidades físicas o visuales deben ser sustantivos (ej. `UserService`, `ProfileCard`).

### Convenciones de Escritura (*Cases*)
| Estilo | Ejemplo | Uso Común |
| :--- | :--- | :--- |
| `camelCase` | `totalPrice`, `isLoggedIn` | Variables, funciones y propiedades de objetos en JavaScript. |
| `PascalCase` | `UserProfile`, `NavBar` | Clases y componentes de React. |
| `snake_case` | `user_id`, `created_at` | Nombres de archivos, columnas SQL y claves de respuestas API (JSON). |
| `UPPER_SNAKE` | `API_URL`, `MAX_SIZE` | Constantes globales inmutables. |
| `kebab-case` | `user-card.css`, `/users-list` | URLs, selectores CSS y nombres de archivos estáticos. |

---

## 📦 2. Modularidad y Principio DRY (Don't Repeat Yourself)

Divide el sistema en piezas pequeñas, independientes y reutilizables. Evita los componentes y funciones monolíticas que hacen demasiadas cosas.

### Principios de Modularidad
- [ ] **Responsabilidad Única:** Cada función o componente debe hacer una sola cosa y hacerla bien.
- [ ] **Alta Cohesión:** Agrupa los elementos relacionados en el mismo módulo o archivo.
- [ ] **Bajo Acoplamiento:** Minimiza las dependencias directas entre módulos independientes para que los cambios en uno no rompan el otro.
- [ ] **Reutilización:** Si escribes la misma lógica en más de dos lugares, abstáela en una función o componente utilitario.

*Ejemplo de código modular:*
```javascript
// ❌ Monolito difícil de probar y mantener
function procesar(u) {
  // valida, formatea, guarda en BD, envía email y registra log...
}

// ✅ Modularizado por responsabilidades
validar(u);
const d = formatear(u);
guardar(d);
enviarEmail(u);
registrarLog(u);
```

---

## 🛠️ 3. Técnicas de Refactorización

Refactorizar significa mejorar la estructura interna del código sin alterar su comportamiento externo.

### ¿Cuándo Refactorizar?
- **Regla de tres:** A la tercera vez que copias y pegas o repites un trozo de lógica, refactoriza en un elemento común.
- **Antes de añadir:** Ordena la casa (limpia el código viejo) antes de implementar una funcionalidad nueva.
- **Al corregir bugs:** Si te cuesta encontrar el origen de un error, el código te está pidiendo a gritos una limpieza.
- **Code Smells:** Atento a funciones extremadamente largas, nombres de variables confusos y duplicidad de lógica.

### Técnicas Clave
1. **Extract Function:** Extrae bloques de lógica interna hacia sus propias funciones secundarias con nombres autoexplicativos.
2. **Rename:** Elige nombres que revelen la intención. El mejor comentario en el código es un excelente nombre de variable.
3. **Replace Magic Number:** Sustituye números o textos sueltos en el código por constantes con nombres claros (ej. cambiar `1.13` por la constante `const IVA = 1.13;`).
4. **Guard Clauses (Salidas Tempranas):** Retorna inmediatamente al inicio de la función ante condiciones de error o nulidad para evitar el anidamiento profundo de condicionales `if-else`.
5. **Decompose Conditional:** Extrae condiciones lógicas complejas a funciones booleanas con nombres semánticos.
6. **Remove Dead Code:** Borra cualquier fragmento de código que no se use. Recuerda que Git mantendrá el historial por ti si necesitas recuperarlo en el futuro.

*Ejemplo de Guard Clauses:*
```javascript
// ❌ Anidamiento profundo (difícil de leer)
function precio(u) {
  if (u) {
    if (u.activo) {
      return u.plan * 1.13;
    }
  }
  return 0;
}

// ✅ Salidas tempranas (plano y legible)
const IVA = 1.13;
function precio(u) {
  if (!u || !u.activo) return 0;
  return u.plan * IVA;
}
```

---

## ⚡ 4. Optimización de Rendimiento Consciente

La optimización debe aplicarse con criterio técnico, evitando caer en la trampa de la optimización prematura.

### Reglas de Oro de la Optimización
1. **Primero funciona, luego optimiza:** Un código correcto y legible pero lento siempre vencerá a un código rápido pero lleno de bugs.
2. **Mide, no adivines:** Utiliza herramientas de perfilado (*profiler*) para identificar cuellos de botella reales antes de alterar el código.
3. **Optimiza el cuello de botella:** El 80% del tiempo de ejecución suele concentrarse en apenas el 20% del código (enfoca ahí tus esfuerzos).
4. **No sacrifiques claridad:** Rara vez una micro-optimización de milisegundos compensa la pérdida de legibilidad de tu base de código.

### Optimización en la Práctica (JavaScript)
- [ ] **Evita trabajo redundante en bucles:** Cachea la longitud de arreglos en bucles imperativos tradicionales, o mejor aún, utiliza métodos declarativos.
```javascript
// ❌ Evaluando .length en cada iteración
for (let i = 0; i < arr.length; i++) { ... }

// ✅ Cacheando el tamaño
for (let i = 0, n = arr.length; i < n; i++) { ... }

// ✅ Alternativa recomendada: Métodos declarativos
const total = xs.map(caro).reduce((acc, b) => acc + b, 0);
```
- [ ] **Presta atención a la Complejidad Algorítmica (Big-O):** Elegir la estructura de datos o el algoritmo adecuado (ej. O(1) o O(log n)) tiene un impacto infinitamente mayor que micro-optimizar líneas sueltas (evita en lo posible bucles anidados O(n²)).

---

## ⚛️ 5. Buenas Prácticas en React

Cuando trabajes con interfaces de usuario en React, debes sumar las siguientes convenciones y reglas estructurales:

### Convenciones de React
- [ ] **Componentes en PascalCase:** Ej. `<UserCard />`, `<NavBar />`.
- [ ] **Props y Estados en camelCase:** Ej. `const [isOpen, setIsOpen] = useState(false);`.
- [ ] **Hooks personalizados con prefijo `use`:** Siempre que extraigas lógica de estado, usa el prefijo (ej. `useAuth()`, `useFetchData()`).
- [ ] **Handlers con prefijo `handle`:** Las funciones que manejan eventos de usuario deben usar este prefijo (ej. `handleSubmit`, `handleClick`).
- [ ] **Un componente por archivo:** Cada componente debe vivir en su propio archivo, y el nombre del archivo debe coincidir exactamente con el del componente (ej. `UserCard.jsx`).

### Optimización y Estructuración en React
- [ ] **Divide la UI:** No construyas pantallas monolíticas; separa tu UI en componentes atómicos pequeños y de responsabilidad única.
- [ ] **Custom Hooks:** Separa la lógica de negocio y las peticiones de datos de la interfaz visual encapsulándola en hooks de React personalizados.
- [ ] **Evita renders innecesarios:** Utiliza `useMemo` y `useCallback` de manera inteligente para evitar cálculos redundantes o recreación de referencias.
- [ ] **Listas con `key` estables:** Al renderizar listas con `.map()`, utiliza un identificador único estable (como un ID de base de datos) como propiedad `key`. **Nunca** uses el índice del bucle si los elementos de la lista pueden reordenarse, filtrarse o eliminarse.
- [ ] **Lazy Loading:** Divide el paquete de tu aplicación mediante cargas bajo demanda utilizando `React.lazy` y `<Suspense />`.
- [ ] **Evita el *Prop Drilling*:** Si una propiedad pasa a través de muchos niveles de componentes intermedios que no la necesitan, implementa Context API o composición de componentes.

---

## 🛠️ 6. Estándares y Automatización del Entorno

La consistencia técnica del equipo siempre es más importante que la preferencia personal. Asegura tu flujo de desarrollo con las siguientes herramientas de estandarización:

* **ESLint:** Analiza el código de forma estática para detectar errores de sintaxis y estilos inconsistentes automáticamente.
* **Prettier:** Formatea el código de manera uniforme en cada guardado, eliminando debates de estilo en el equipo.
* **EditorConfig:** Garantiza la misma configuración de indentación, codificación de caracteres y saltos de línea entre distintos editores de código.
* **Husky + lint-staged:** Bloquea los commits locales (`git commit`) de manera automatizada si los archivos modificados contienen errores de linter o formato.
* **Guía de Estilo:** Adopta una guía de renombre (como Airbnb, Google o una propia del equipo) para unificar criterios.
* **Convención de Commits (Conventional Commits):** Mantén un historial de cambios legible estructurando tus mensajes bajo convenciones claras (ej. `feat:`, `fix:`, `refactor:`, `style:`).

---

## 📝 7. Checklist para el "Code Review" Diario

Antes de marcar una tarea como finalizada o abrir un Pull Request (PR), hazte las siguientes preguntas rápidas:

- [ ] ¿Los nombres de mis variables, funciones y componentes revelan su intención sin requerir comentarios adicionales?
- [ ] ¿Cada una de mis funciones y componentes tiene una única responsabilidad bien definida?
- [ ] ¿He aplicado el principio DRY para eliminar cualquier código duplicado o copiado?
- [ ] ¿Las convenciones de escritura (`camelCase`, `PascalCase`, etc.) son consistentes en todo el archivo?
- [ ] ¿He evitado el uso de números y textos "mágicos" sustituyéndolos por constantes descriptivas?
- [ ] ¿Mis funciones son lo suficientemente cortas y "planas" (sin anidamientos profundos)?
- [ ] Si he optimizado rendimiento, ¿he medido y comprobado el cuello de botella primero en lugar de adivinar?
- [ ] ¿El linter y el formateador de código están activos, y la consola está libre de advertencias (*warnings*)?

---
*“El código se escribe una vez, pero se lee muchas. Escribe siempre pensando en la persona que tendrá que mantenerlo en el futuro (incluso si esa persona eres tú en 6 meses).”*