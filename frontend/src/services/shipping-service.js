import { ApiError } from './api-client.js';
import { callN8n, isN8nConfigured } from './n8n-service.js';

export const isShippingWebhookConfigured = isN8nConfigured;

async function sendWebhook(action, payload = {}) {
  try { return await callN8n({ action, ...payload }); }
  catch (error) {
    if (!isN8nConfigured) throw new ApiError('La consulta de ciudades y envíos no está configurada todavía.');
    throw error;
  }
}

export async function getCities() {
  const data = await sendWebhook('cities');
  const cities = Array.isArray(data) ? data : data?.cities;
  if (!Array.isArray(cities)) throw new ApiError('La respuesta de ciudades del webhook no es válida.');
  return cities;
}

export async function estimateShipping(cityId, subtotal) {
  const data = await sendWebhook('coverage', { cityId: Number(cityId), subtotal: Number(subtotal) });
  if (!data || typeof data.covered !== 'boolean') throw new ApiError('La respuesta de cobertura del webhook no es válida.');
  return data;
}
