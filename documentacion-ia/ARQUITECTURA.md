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
