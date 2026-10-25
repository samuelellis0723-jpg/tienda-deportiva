import { apiRequest } from './api-client.js';
import { getProductPage } from './product-service.js';
export async function getAdminSummary() { return (await apiRequest('/resumen')).data; }
export async function getRestockReport() { const response = await apiRequest('/alertas-reposicion'); return { data: Array.isArray(response) ? response : response.data ?? [], meta: response.meta ?? {} }; }
export async function getRestockAlerts() { return (await getRestockReport()).data; }

export async function listStoreProducts() {
  const products = [];
  let page = 1;
  let total = Infinity;
  while (products.length < total) {
    const result = await getProductPage({ page: String(page), limit: '100', ordenar: 'nombre', direccion: 'asc' });
    products.push(...result.data);
    total = Number(result.meta?.total ?? products.length);
    if (!result.data.length) break;
    page += 1;
  }
  return products;
}
