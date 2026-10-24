import { apiRequest } from './api-client.js';
export async function createOrder(order, idempotencyKey) {
  return (await apiRequest('/ordenes', { method: 'POST', body: order, headers: { 'Idempotency-Key': idempotencyKey } })).data;
}
