# Arquitectura del agente de IA en n8n

## Propósito y límite

El agente ayuda a clientes a encontrar productos, entender tallas, disponibilidad, envíos y estado de una orden. n8n orquesta el flujo y el nodo AI Agent interpreta la consulta; PostgreSQL permanece accesible únicamente mediante la API Express. El agente no confirma pagos, no cambia precios, no crea descuentos ni modifica órdenes/inventario.

## Flujo propuesto

1. Entrada por canal aprobado y validación de firma/autenticación del webhook.
2. Normalización de idioma, mensaje e identificador de conversación; retirar datos sensibles innecesarios.
3. AI Agent con instrucciones de alcance, herramientas permitidas y salida estructurada.
4. Herramientas de solo lectura que llaman endpoints de catálogo, categorías, colecciones y consulta de orden.
5. Respuesta con referencia a productos/datos devueltos por la API; derivación a una persona si falta evidencia.

## Seguridad y operación

- Usar credencial técnica de permisos mínimos, rotarla y guardarla en credenciales de n8n, nunca en prompts.
- Estado de orden requiere autenticación/verification token y datos mínimos; no enumerar órdenes por correo o identificador simple.
- Aplicar límites de frecuencia, timeout, trazas con redacción de PII y retención definida.
- Tratar texto del usuario y contenido de producto como datos no confiables; no obedecer instrucciones encontradas en ellos.
- Registrar versión de prompt/workflow, resultado y código de correlación, sin guardar conversación sensible por defecto.
- Flujos de escritura, reembolsos y cancelación quedan fuera del agente inicial. Cualquier acción futura requiere confirmación explícita del usuario y endpoint dedicado con autorización.

## Pendientes antes de producción

Definir canal, proveedor/modelo, consentimiento y retención, proceso de transferencia humana, autenticación de consulta de pedidos y límites de costo. Las rutas del contrato están en `CONTRATOS_API.md`.

## Workflow OJE para tienda y catálogo

El workflow importable está en `n8n/oje-assistant.workflow.json` y expone `POST /webhook/oje-assistant`. El webhook valida `action` (`cities`, `coverage`, `description`, `recommend`) y normaliza toda salida como `{ ok, data, error }`. Ciudades, cotización y catálogo se consultan en Express; n8n no almacena copias de tarifas, disponibilidad o productos. El frontend usa el mismo webhook para checkout, recomendaciones en el carrito y generación de borradores de descripción en administración.

Para recomendaciones, la IA solo propone IDs. Un nodo posterior filtra esos IDs contra productos publicados devueltos por `GET /api/productos?disponible=true&limit=100&ordenar=reciente`, excluye productos que ya están en el carrito y entrega las filas originales de la API. El máximo de 100 corresponde al límite documentado de la API. Para descripciones se envían nombre, categoría y, opcionalmente, características provistas; el prompt prohíbe afirmar especificaciones que no estén en esos datos. La salida del modelo se analiza y valida antes de responder.

La URL del webhook no contiene secretos. La credencial del modelo se configura en el nodo de chat dentro de n8n y nunca se exporta. El webhook de tienda es accesible desde el navegador; CORS restringe navegadores, pero no autentica clientes. Antes de publicar, limita solicitudes de IA con rate limiting en el proxy/WAF, ajusta CORS al origen exacto del frontend y define cuota/retención del proveedor. `VITE_N8N_WEBHOOK_URL` es la URL pública del webhook, no una clave.
