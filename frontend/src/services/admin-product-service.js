import { apiRequest } from './api-client.js';
import { notifyCatalogChange } from './catalog-events.js';
const data = async (path, options) => (await apiRequest(path, options)).data;
async function mutate(path, options) { const result = await data(path, options); notifyCatalogChange(); return result; }
export async function listAdminProducts(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)); return apiRequest(`/productos?${query}`); }
export async function getAdminProduct(id) { return data(`/productos/${encodeURIComponent(id)}?vista=admin`); }
export async function saveProduct(product, id) { return mutate(id ? `/productos/${encodeURIComponent(id)}` : '/productos', { method: id ? 'PATCH' : 'POST', body: product }); }
export async function deleteProduct(id) { return mutate(`/productos/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function setProductPublication(id, published) { return mutate(`/productos/${encodeURIComponent(id)}/${published ? 'publicar' : 'despublicar'}`, { method: 'POST' }); }
