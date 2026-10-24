import { createHash } from 'node:crypto';
import * as orders from '../models/orderModel.js';
import { ApiError } from '../utils/errors.js';
import { optionalString, positiveId, rejectUnknownFields, requireObject, requiredString } from '../utils/validation.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicStates = {
  nueva: ['pending_payment'], pagada: ['paid', 'processing'], enviada: ['shipped'],
  entregada: ['delivered'], cancelada: ['cancelled'],
};
const stateNames = { pending_payment: 'nueva', paid: 'pagada', processing: 'pagada', shipped: 'enviada', delivered: 'entregada', cancelled: 'cancelada' };

function parseCheckout(input, idempotencyKey) {
  const body = requireObject(input);
  rejectUnknownFields(body, ['customer', 'cityId', 'addressLine', 'items', 'couponCode']);
  const customerInput = requireObject(body.customer);
  rejectUnknownFields(customerInput, ['email', 'firstName', 'lastName', 'phone']);
  const email = requiredString(customerInput.email, 'customer.email', { max: 254 });
  if (!emailPattern.test(email)) throw new ApiError(400, 'El email del cliente no es válido.');
  const customer = {
    email: email.toLowerCase(),
    firstName: requiredString(customerInput.firstName, 'customer.firstName', { max: 120 }),
    lastName: requiredString(customerInput.lastName, 'customer.lastName', { max: 120 }),
    phone: optionalString(customerInput.phone, 'customer.phone', { max: 40 }),
  };
  const cityId = positiveId(body.cityId, 'cityId');
  const addressLine = requiredString(body.addressLine, 'addressLine', { max: 500 });
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new ApiError(400, 'items debe contener entre 1 y 50 variantes.');
  const seen = new Set();
  const items = body.items.map((item) => {
    requireObject(item);
    rejectUnknownFields(item, ['variantId', 'quantity']);
    const variantId = positiveId(item.variantId, 'variantId');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new ApiError(400, 'Cada quantity debe ser un entero entre 1 y 1000.');
    if (seen.has(variantId)) throw new ApiError(400, 'No repitas una variante; combina las cantidades en una sola línea.');
    seen.add(variantId);
    return { variantId, quantity: item.quantity };
  }).sort((a, b) => a.variantId - b.variantId);
  const couponCode = body.couponCode === undefined || body.couponCode === null || body.couponCode === ''
    ? null : requiredString(body.couponCode, 'couponCode', { max: 80, pattern: /^[a-zA-Z0-9_-]+$/ }).toUpperCase();
  const fingerprint = createHash('sha256').update(JSON.stringify({ customer, cityId, addressLine, items, couponCode })).digest('hex');
  return { customer, cityId, addressLine, items, couponCode, idempotencyKey, fingerprint };
}

function parseDateFilter(value, field) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) throw new ApiError(400, `El filtro ${field} debe ser una fecha válida.`);
  return new Date(value).toISOString();
}
function present(order) { return order ? { ...order, status: stateNames[order.status] ?? order.status } : null; }

export async function create(input, key) {
  if (typeof key !== 'string' || key.trim().length < 8 || key.trim().length > 200) throw new ApiError(400, 'La cabecera Idempotency-Key es obligatoria y debe tener entre 8 y 200 caracteres.');
  return present(await orders.createOrder(parseCheckout(input, key.trim())));
}

export async function list(query) {
  const known = ['estado', 'desde', 'hasta', 'q', 'page', 'limit'];
  const unknown = Object.keys(query).filter((key) => !known.includes(key));
  if (unknown.length) throw new ApiError(400, `Filtro(s) no permitido(s): ${unknown.join(', ')}.`);
  const statuses = query.estado === undefined ? null : publicStates[query.estado];
  if (query.estado !== undefined && !statuses) throw new ApiError(400, 'El filtro estado no es válido.');
  const from = parseDateFilter(query.desde, 'desde');
  const to = parseDateFilter(query.hasta, 'hasta');
  if (from && to && from > to) throw new ApiError(400, 'desde debe ser anterior o igual a hasta.');
  const q = query.q === undefined ? null : requiredString(query.q, 'q', { max: 200 });
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || page > 1000000) throw new ApiError(400, 'page no es válido.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'limit debe estar entre 1 y 100.');
  const result = await orders.listOrders({ statuses, from, to, q, limit, offset: (page - 1) * limit });
  return { data: result.data.map(present), meta: { page, limit, total: result.total } };
}

export async function get(id) {
  const order = await orders.getOrder(positiveId(id));
  if (!order) throw new ApiError(404, 'Orden no encontrada.');
  return present(order);
}

export async function advance(id, input, actorId) {
  const body = requireObject(input);
  rejectUnknownFields(body, ['estado']);
  const toStatus = { pagada: 'paid', enviada: 'shipped', entregada: 'delivered' }[body.estado];
  if (!toStatus) throw new ApiError(400, 'estado debe ser pagada, enviada o entregada.');
  const order = await orders.advanceOrder(positiveId(id), toStatus, actorId);
  if (!order) throw new ApiError(404, 'Orden no encontrada.');
  return present(order);
}

export async function confirmPayment(id, input, actorId) {
  const body = requireObject(input);
  rejectUnknownFields(body, ['reference', 'note']);
  const reference = body.reference === undefined || body.reference === null || body.reference === ''
    ? null : requiredString(body.reference, 'reference', { max: 120 });
  const note = body.note === undefined || body.note === null || body.note === ''
    ? null : requiredString(body.note, 'note', { max: 500 });
  const payment = await orders.confirmManualPayment(positiveId(id), { reference, note }, actorId);
  if (!payment) throw new ApiError(404, 'Orden no encontrada.');
  return payment;
}

export async function cancel(id, actorId) {
  const order = await orders.cancelOrder(positiveId(id), actorId);
  if (!order) throw new ApiError(404, 'Orden no encontrada.');
  return present(order);
}
