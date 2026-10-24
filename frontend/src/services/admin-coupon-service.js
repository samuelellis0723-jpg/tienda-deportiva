import { apiRequest } from './api-client.js';
const data = async (path, options) => (await apiRequest(path, options)).data;
export async function listAdminCoupons() { return data('/cupones'); }
export async function saveCoupon(coupon, id) { return data(id ? `/cupones/${encodeURIComponent(id)}` : '/cupones', { method: id ? 'PATCH' : 'POST', body: coupon }); }
export async function deleteCoupon(id) { return data(`/cupones/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
