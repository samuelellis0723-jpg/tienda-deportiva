import { apiRequest, ApiError } from './api-client.js';
export async function createOrder(order, idempotencyKey) {
  const result = (await apiRequest('/ordenes', { method: 'POST', body: order, headers: { 'Idempotency-Key': idempotencyKey } })).data;
  if (!result || (!result.id && !result.orderNumber) || result.total == null || result.total === '' || !Number.isFinite(Number(result.total)) || Number(result.total) < 0) {
    throw new ApiError('No recibimos una confirmación válida de la orden.');
  }
  return result;
}
