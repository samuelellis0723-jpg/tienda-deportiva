import { apiRequest } from './api-client.js';
const data = async (path, options) => (await apiRequest(path, options)).data;
export async function listAdminProducts(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)); return data(`/productos?${query}`); }
export async function getAdminProduct(id) { return data(`/productos/${encodeURIComponent(id)}`); }
export async function saveProduct(product, id) { return data(id ? `/productos/${encodeURIComponent(id)}` : '/productos', { method: id ? 'PATCH' : 'POST', body: product }); }
export async function deleteProduct(id) { return data(`/productos/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function setProductPublication(id, published) { return data(`/productos/${encodeURIComponent(id)}/${published ? 'publicar' : 'despublicar'}`, { method: 'POST' }); }
