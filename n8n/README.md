# OJE en n8n

## Importar y configurar

1. En n8n, importa `oje-assistant.workflow.json`. Se importa inactivo.
2. Crea la variable de instancia `OJE_API_BASE_URL` con la URL base de Express que pueda alcanzar el proceso n8n, por ejemplo la URL interna del servicio backend. No incluyas `/` al final. El workflow añade `/api` a las rutas.
3. Abre `DeepSeek Chat Model` y selecciona/crea tu credencial de DeepSeek dentro de n8n. El workflow exportado no incluye credenciales vinculadas a una cuenta.
4. En el nodo `OJE Webhook`, configura `Allowed Origins (CORS)` con el origen exacto del frontend. El export permite `http://localhost:5173` y `http://127.0.0.1:5173`; en producción reemplázalos por el origen exacto del sitio.
5. Guarda y activa el workflow. Copia la **Production URL** del nodo, cuya ruta acaba en `/webhook/oje-assistant`, a `VITE_N8N_WEBHOOK_URL` en el entorno de build del frontend.

La URL de desarrollo `/webhook-test/oje-assistant` solo funciona mientras el nodo está en modo de escucha. No la uses como URL de producción. Reinicia Vite después de cambiar `.env`.

En desarrollo, si no se configura una URL, el frontend usa el proxy local `/n8n/webhook/oje-assistant`. En producción, define `VITE_N8N_WEBHOOK_URL` con la Production URL completa; el frontend conserva el dominio configurado y n8n debe permitir el origen exacto del sitio en CORS. Sin URL configurada, las acciones de IA quedan deshabilitadas en el build de producción.

## Contratos

El frontend envía JSON por `POST`. Todas las salidas son `{ "ok": boolean, "data": any|null, "error": string|null }`:

| Acción | Entrada | `data` en éxito |
| --- | --- | --- |
| `cities` | `{ "action": "cities" }` | Lista `GET /api/ciudades` sin modificar sus datos |
| `coverage` | `{ "action": "coverage", "cityId": 1, "subtotal": 20000 }` | Cotización original de `POST /api/envios/cotizar` |
| `description` | `{ "action": "description", "name": "Judogi", "category": "Judo", "features": [] }` | `{ "description": "..." }` |
| `recommend` | `{ "action": "recommend", "items": [{ "productId": 1, "name": "Judogi", "size": "A2", "color": "Azul", "quantity": 1 }] }` | `{ "products": [...] }` con filas originales de la API |

El nombre y la categoría son requeridos para `description`; `features` admite hasta ocho textos cortos opcionales. Para `recommend`, el workflow consulta `GET /api/productos?disponible=true&limit=100&ordenar=reciente`, que solo entrega productos publicados. La IA devuelve IDs; el workflow descarta IDs mal formados, inexistentes, repetidos y productos ya incluidos en el carrito. Si el catálogo supera 100 filas, las recomendaciones consideran las 100 filas recientes que consulta el endpoint.

El workflow no copia ciudades, tarifas, precios, stock ni catálogo. `POST /api/ordenes` sigue siendo responsable de recalcular y validar todo el checkout.

## Pruebas

Desde la raíz del repositorio, ejecuta las comprobaciones de contrato sin n8n:

```sh
node --test n8n/tests/workflow-contract.test.mjs
```

Estas pruebas ejecutan las funciones Code exportadas con entradas controladas; no son pruebas de integración con n8n, el modelo, Express o PostgreSQL.

Después de configurar n8n, prueba con la Test URL y una API alcanzable desde n8n. Usa IDs reales obtenidos de `GET /api/ciudades` y `GET /api/productos`; no uses credenciales en los ejemplos. Prueba también una acción desconocida, subtotal negativo, API apagada, respuesta del modelo no JSON y la rama de error del modelo sin credencial. Los errores externos se normalizan y no devuelven trazas, URLs internas ni detalles del proveedor.

Ejemplo de llamada (sustituye la URL de prueba por la que muestra tu instancia):

```sh
curl -X POST 'https://TU-N8N/webhook-test/oje-assistant' \
  -H 'Content-Type: application/json' \
  -d '{"action":"description","name":"Judogi","category":"Judo","features":[]}'
```

## Seguridad operativa

La URL de webhook es pública para que la tienda pueda llamarla; no es una credencial. CORS solo limita navegadores y no autentica llamadas directas. Antes de producción, añade rate limiting y límites de gasto en un proxy/WAF, permite solo los orígenes del frontend en CORS y define la política de retención del proveedor de IA. Mantén todas las credenciales dentro de n8n.
