import { ApiError } from './errors.js';

export function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'El cuerpo debe ser un objeto JSON.');
  return body;
}

export function rejectUnknownFields(body, allowed) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new ApiError(400, `Campo(s) no permitido(s): ${unknown.join(', ')}.`);
}

export function requiredString(value, field, { max = 200, pattern } = {}) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || (pattern && !pattern.test(value.trim()))) {
    throw new ApiError(400, `El campo ${field} no es válido.`);
  }
  return value.trim();
}

export function optionalString(value, field, { max = 5000 } = {}) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value !== 'string' || value.length > max) throw new ApiError(400, `El campo ${field} no es válido.`);
  return value.trim();
}

export function positiveMoney(value, field) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-8) {
    throw new ApiError(400, `El campo ${field} debe ser un importe mayor que cero con hasta dos decimales.`);
  }
  return amount;
}

export function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 2147483647) throw new ApiError(400, `El campo ${field} debe ser un entero igual o mayor que cero.`);
  return value;
}

export function positiveId(value, field = 'id') {
  if (!/^[1-9]\d*$/.test(String(value))) throw new ApiError(400, `El campo ${field} debe ser un identificador positivo.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new ApiError(400, `El campo ${field} no es válido.`);
  return parsed;
}

export function optionalBoolean(value, field) {
  if (typeof value !== 'boolean') throw new ApiError(400, `El campo ${field} debe ser booleano.`);
  return value;
}