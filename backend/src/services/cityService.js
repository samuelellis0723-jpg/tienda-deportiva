import * as cities from '../models/cityModel.js';
import { ApiError } from '../utils/errors.js';
import { positiveId, rejectUnknownFields, requireObject, requiredString } from '../utils/validation.js';

const fields = ['name', 'province', 'shippingCost', 'isActive'];

function parseCity(input, partial = false) {
  const body = requireObject(input);
  rejectUnknownFields(body, fields);
  if (partial && Object.keys(body).length === 0) throw new ApiError(400, 'Envía al menos un campo para actualizar.');
  const parsed = {};
  for (const key of fields) {
    if (!(key in body)) {
      if (!partial && key === 'isActive') parsed.isActive = true;
      else if (!partial) throw new ApiError(400, `Falta el campo requerido: ${key}.`);
      continue;
    }
    if (key === 'name' || key === 'province') parsed[key] = requiredString(body[key], key, { max: 120 });
    if (key === 'shippingCost') {
      const amount = Number(body[key]);
      if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) {
        throw new ApiError(400, 'El costo de envío debe ser un importe igual o mayor que cero con hasta dos decimales.');
      }
      parsed.shippingCost = amount;
    }
    if (key === 'isActive') {
      if (typeof body[key] !== 'boolean') throw new ApiError(400, 'El campo isActive debe ser booleano.');
      parsed.isActive = body[key];
    }
  }
  return parsed;
}

export async function list({ includeInactive = false } = {}) { return cities.listCities({ includeInactive }); }
export async function get(id, { includeInactive = false } = {}) {
  const cityId = positiveId(id);
  const city = await cities.getCity(cityId);
  if (!city || (!includeInactive && !city.isActive)) throw new ApiError(404, 'Ciudad no encontrada.');
  return city;
}
export async function create(input) { return cities.insertCity(parseCity(input)); }
export async function update(id, input) {
  const cityId = positiveId(id);
  const current = await cities.getCity(cityId);
  if (!current) throw new ApiError(404, 'Ciudad no encontrada.');
  const city = await cities.updateCity(cityId, { ...current, ...parseCity(input, true) });
  if (!city) throw new ApiError(404, 'Ciudad no encontrada.');
  return city;
}
export async function remove(id) {
  if (!(await cities.deleteCity(positiveId(id)))) throw new ApiError(404, 'Ciudad no encontrada.');
}
export async function estimate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ['cityId', 'subtotal']);
  const cityId = positiveId(body.cityId, 'cityId');
  const subtotal = body.subtotal;
  if (typeof subtotal !== 'number' || !Number.isFinite(subtotal) || subtotal < 0 || Math.round(subtotal * 100) !== subtotal * 100) {
    throw new ApiError(400, 'El campo subtotal debe ser un importe igual o mayor que cero con hasta dos decimales.');
  }
  const [city, threshold] = await Promise.all([cities.getCity(cityId), cities.getFreeShippingThreshold()]);
  if (!city) throw new ApiError(404, 'Ciudad no encontrada.');
  if (!city.isActive) return { covered: false, city: { id: city.id, name: city.name, province: city.province }, shippingCost: null, freeShippingThreshold: threshold, message: 'La ciudad no tiene cobertura.' };
  const freeShipping = subtotal >= threshold;
  return {
    covered: true,
    city: { id: city.id, name: city.name, province: city.province },
    shippingCost: freeShipping ? 0 : Number(city.shippingCost),
    baseShippingCost: Number(city.shippingCost),
    freeShippingThreshold: threshold,
    freeShipping,
    message: freeShipping ? 'Envío gratis para este subtotal.' : 'La ciudad tiene cobertura; aplica la tarifa de envío indicada.',
  };
}
