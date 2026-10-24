import * as coupons from '../models/couponModel.js';
import { ApiError } from '../utils/errors.js';
import { positiveId, positiveMoney, rejectUnknownFields, requireObject, requiredString } from '../utils/validation.js';

const couponFields = ['code', 'discountType', 'discountValue', 'startsAt', 'expiresAt', 'usageLimit', 'perCustomerLimit', 'minimumSubtotal', 'isActive'];

function validDate(value, field) {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) throw new ApiError(400, `El campo ${field} debe ser una fecha válida.`);
  return new Date(value).toISOString();
}

function parseCoupon(input, partial = false) {
  const body = requireObject(input);
  rejectUnknownFields(body, couponFields);
  if (partial && Object.keys(body).length === 0) throw new ApiError(400, 'Envía al menos un campo para actualizar.');
  const parsed = {};
  for (const field of couponFields) {
    if (!(field in body)) {
      if (!partial) {
        if (field === 'usageLimit') parsed.usageLimit = null;
        else if (field === 'perCustomerLimit') parsed.perCustomerLimit = 1;
        else if (field === 'minimumSubtotal') parsed.minimumSubtotal = 0;
        else if (field === 'isActive') parsed.isActive = true;
        else throw new ApiError(400, `Falta el campo requerido: ${field}.`);
      }
      continue;
    }
    if (field === 'code') parsed.code = requiredString(body[field], field, { max: 80, pattern: /^[a-zA-Z0-9_-]+$/ }).toUpperCase();
    if (field === 'discountType') {
      if (!['fixed', 'percent'].includes(body[field])) throw new ApiError(400, 'discountType debe ser fixed o percent.');
      parsed.discountType = body[field];
    }
    if (field === 'discountValue') parsed.discountValue = positiveMoney(body[field], field);
    if (field === 'startsAt' || field === 'expiresAt') parsed[field] = validDate(body[field], field);
    if (field === 'usageLimit') {
      if (body[field] === null) parsed.usageLimit = null;
      else if (!Number.isInteger(body[field]) || body[field] < 1) throw new ApiError(400, 'usageLimit debe ser un entero positivo o null.');
      else parsed.usageLimit = body[field];
    }
    if (field === 'perCustomerLimit') {
      if (!Number.isInteger(body[field]) || body[field] < 1) throw new ApiError(400, 'perCustomerLimit debe ser un entero positivo.');
      parsed.perCustomerLimit = body[field];
    }
    if (field === 'minimumSubtotal') {
      const amount = Number(body[field]);
      if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) throw new ApiError(400, 'minimumSubtotal debe ser un importe igual o mayor que cero con hasta dos decimales.');
      parsed.minimumSubtotal = amount;
    }
    if (field === 'isActive') {
      if (typeof body[field] !== 'boolean') throw new ApiError(400, 'isActive debe ser booleano.');
      parsed.isActive = body[field];
    }
  }
  const startsAt = parsed.startsAt ?? (partial ? null : null);
  const expiresAt = parsed.expiresAt ?? null;
  if (startsAt && expiresAt && expiresAt <= startsAt) throw new ApiError(400, 'expiresAt debe ser posterior a startsAt.');
  return parsed;
}

function amountCents(value) { return Math.round(Number(value) * 100); }
function money(cents) { return Number((cents / 100).toFixed(2)); }

export async function list() { return coupons.listCoupons(); }
export async function get(id) {
  const coupon = await coupons.getCoupon(positiveId(id));
  if (!coupon) throw new ApiError(404, 'Cupón no encontrado.');
  return coupon;
}
export async function create(input) { return coupons.insertCoupon(parseCoupon(input)); }
export async function update(id, input) {
  const couponId = positiveId(id);
  const current = await coupons.getCoupon(couponId);
  if (!current) throw new ApiError(404, 'Cupón no encontrado.');
  const couponInput = { ...current, ...parseCoupon(input, true) };
  const coupon = parseCoupon({ ...couponInput, startsAt: new Date(couponInput.startsAt).toISOString(), expiresAt: new Date(couponInput.expiresAt).toISOString() });
  const updated = await coupons.updateCoupon(couponId, coupon);
  if (!updated) throw new ApiError(404, 'Cupón no encontrado.');
  return updated;
}
export async function remove(id) {
  if (!(await coupons.deleteCoupon(positiveId(id)))) throw new ApiError(404, 'Cupón no encontrado.');
}

function parseValidation(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ['code', 'items', 'customerId']);
  const code = requiredString(body.code, 'code', { max: 80, pattern: /^[a-zA-Z0-9_-]+$/ }).toUpperCase();
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new ApiError(400, 'items debe contener entre 1 y 50 variantes.');
  const seen = new Set();
  const items = body.items.map((item) => {
    requireObject(item);
    rejectUnknownFields(item, ['variantId', 'quantity']);
    const variantId = positiveId(item.variantId, 'variantId');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new ApiError(400, 'Cada quantity debe ser un entero entre 1 y 1000.');
    if (seen.has(variantId)) throw new ApiError(400, 'No repitas una variante en items.');
    seen.add(variantId);
    return { variantId, quantity: item.quantity };
  });
  const customerId = body.customerId === undefined || body.customerId === null ? null : positiveId(body.customerId, 'customerId');
  return { code, items, customerId };
}

export async function validate(input) {
  const { code, items, customerId } = parseValidation(input);
  const prices = await coupons.priceVariants(items.map((item) => item.variantId));
  if (prices.length !== items.length) throw new ApiError(400, 'Una o más variantes no existen, están inactivas o no pertenecen a productos publicados.');
  const byId = new Map(prices.map((row) => [String(row.variantId), row.unitPrice]));
  const subtotalCents = items.reduce((sum, item) => sum + amountCents(byId.get(String(item.variantId))) * item.quantity, 0);
  if (!Number.isSafeInteger(subtotalCents)) throw new ApiError(400, 'El subtotal calculado excede el límite permitido.');
  const subtotal = money(subtotalCents);
  const coupon = await coupons.getCouponUsage(code, customerId);
  const reject = (message) => ({ valid: false, code, subtotal, discount: 0, message });
  if (!coupon) return reject('El cupón no existe.');
  const now = Date.now();
  if (!coupon.isActive) return reject('El cupón está inactivo.');
  if (new Date(coupon.startsAt).getTime() > now) return reject('El cupón todavía no está vigente.');
  if (new Date(coupon.expiresAt).getTime() <= now) return reject('El cupón venció.');
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return reject('El cupón agotó sus usos disponibles.');
  if (customerId !== null && coupon.customerUsageCount >= coupon.perCustomerLimit) return reject('Este cliente ya usó el cupón el máximo de veces permitido.');
  if (subtotalCents < amountCents(coupon.minimumSubtotal)) return reject('El subtotal no alcanza el mínimo requerido por el cupón.');
  const rawDiscountCents = coupon.discountType === 'percent'
    ? Math.round(subtotalCents * Number(coupon.discountValue) / 100)
    : amountCents(coupon.discountValue);
  const discount = money(Math.min(subtotalCents, rawDiscountCents));
  return { valid: true, code, subtotal, discount, message: 'Cupón válido. El descuento es una estimación y se recalculará al crear la orden.' };
}
