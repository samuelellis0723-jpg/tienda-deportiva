import { apiRequest } from './api-client.js';
export async function getAdminSummary() { return (await apiRequest('/resumen')).data; }
export async function getRestockAlerts() { const response = await apiRequest('/alertas-reposicion'); return Array.isArray(response) ? response : response.data ?? []; }
