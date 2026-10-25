import { apiRequest, ApiError } from './api-client.js';
export async function getProducts(params = {}) {
  const query = new URLSearchParams({ ...params, limit: params.limit || '100' });
  const response = await apiRequest(`/productos?${query}`);
  return response.data ?? [];
}
export async function getProduct(id) {
  const product = (await apiRequest(`/productos/${encodeURIComponent(id)}`)).data;
  if (!product || !product.id || !Array.isArray(product.variantes ?? product.variants) || typeof product.estado !== 'string') throw new ApiError('No recibimos datos válidos del producto. Reintentá la consulta.');
  return product;
}
export async function getProductPage(params = {}) {
  const result = await apiRequest(`/productos?${new URLSearchParams(params)}`);
  return { data: result.data ?? [], meta: result.meta ?? { total: result.data?.length ?? 0 } };
}
export async function getCategories() { return (await apiRequest('/categorias')).data ?? []; }
export async function getProductTypes() { return (await apiRequest('/productos/tipos')).data ?? []; }
