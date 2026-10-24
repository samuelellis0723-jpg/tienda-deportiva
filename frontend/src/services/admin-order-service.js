import { apiRequest } from './api-client.js';
const data = async (path, options) => (await apiRequest(path, options)).data;
export async function listAdminOrders(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)); return apiRequest(`/ordenes?${query}`); }
export async function getAdminOrder(id) { return data(`/ordenes/${encodeURIComponent(id)}`); }
export async function confirmOrderPayment(id, body) { return data(`/ordenes/${encodeURIComponent(id)}/pago/confirmar`, { method: 'POST', body }); }
export async function advanceOrder(id, estado) { return data(`/ordenes/${encodeURIComponent(id)}/estado`, { method: 'PATCH', body: { estado } }); }
export async function cancelOrder(id) { return data(`/ordenes/${encodeURIComponent(id)}/cancelar`, { method: 'POST', body: {} }); }
