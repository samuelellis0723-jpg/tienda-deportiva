import { apiRequest } from './api-client.js';
export async function getProducts(params = {}) {
  const query = new URLSearchParams({ ...params, limit: params.limit || '100' });
  const response = await apiRequest(`/productos?${query}`);
  return response.data ?? [];
}
export async function getProduct(id) { return (await apiRequest(`/productos/${encodeURIComponent(id)}`)).data; }
export async function getCategories() { return (await apiRequest('/categorias')).data ?? []; }
