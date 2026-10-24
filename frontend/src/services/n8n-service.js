import { ApiError } from './api-client.js';

function resolveWebhookUrl(value) {
  const configured = value?.trim();
  if (!configured) return '/n8n/webhook/oje-assistant';

  // Accept a full URL or a base such as /n8n, but always call the same
  // proxied webhook path so the client cannot duplicate /n8n or /webhook.
  const path = configured.replace(/^https?:\/\/[^/]+/i, '').replace(/\/+$/, '');
  if (path.endsWith('/webhook/oje-assistant')) return `/n8n${path.replace(/^\/n8n/, '')}`;
  if (!path || path === '/' || path === '/n8n') return '/n8n/webhook/oje-assistant';
  return `/n8n${path.replace(/^\/n8n/, '')}/webhook/oje-assistant`;
}

const webhookUrl = resolveWebhookUrl(import.meta.env.VITE_N8N_WEBHOOK_URL);
export const isN8nConfigured = Boolean(webhookUrl);

export async function callN8n(payload) {
  if (!webhookUrl) throw new ApiError('El asistente de OJE no está configurado todavía.');
  let response;
  try {
    response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    throw new ApiError('No se pudo conectar con el asistente de OJE.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError('El asistente de OJE no está disponible.', response.status);
  if (!result || typeof result.ok !== 'boolean' || !('data' in result) || !('error' in result)) throw new ApiError('El asistente debe responder { ok, data, error }.');
  if (!result.ok) throw new ApiError(typeof result.error === 'string' ? result.error : 'No se pudo completar la consulta.');
  return result.data;
}

export async function generateProductDescription({ name, category, features = [] }) {
  const data = await callN8n({ action: 'description', name, category, features });
  if (typeof data?.description !== 'string' || !data.description.trim()) throw new ApiError('La respuesta de descripción no es válida.');
  return data.description.trim();
}

export async function recommendProducts(items) {
  const data = await callN8n({ action: 'recommend', items });
  if (!Array.isArray(data?.products)) throw new ApiError('La respuesta de recomendaciones no es válida.');
  return data.products;
}
