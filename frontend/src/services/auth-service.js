import { apiRequest } from './api-client.js';
export async function getSession() { return (await apiRequest('/auth/me')).data; }
export async function loginRequest(email, password) { return (await apiRequest('/auth/login', { method: 'POST', body: { email, password } })).data; }
export async function logoutRequest() { return (await apiRequest('/auth/logout', { method: 'POST' })).data; }
