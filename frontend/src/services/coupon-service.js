import { apiRequest } from './api-client.js';
export async function validateCoupon(code, items) {
  return (await apiRequest('/cupones/validar', { method: 'POST', body: { code, items } })).data;
}
