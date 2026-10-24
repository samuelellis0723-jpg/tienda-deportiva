import * as categories from '../models/categoryModel.js';
import { ApiError } from '../utils/errors.js';
import { optionalString, positiveId, rejectUnknownFields, requireObject, requiredString } from '../utils/validation.js';

const fields = ['parentId', 'slug', 'name', 'description', 'isActive'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseCategory(input, partial = false) {
  const body = requireObject(input);
  rejectUnknownFields(body, fields);
  if (partial && Object.keys(body).length === 0) throw new ApiError(400, 'Envía al menos un campo para actualizar.');
  const parsed = {};
  for (const key of fields) {
    if (!(key in body)) {
      if (!partial) {
        if (key === 'parentId') parsed.parentId = null;
        else if (key === 'description') parsed.description = null;
        else if (key === 'isActive') parsed.isActive = true;
        else throw new ApiError(400, `Falta el campo requerido: ${key}.`);
      }
      continue;
    }
    if (key === 'parentId') parsed.parentId = body[key] === null ? null : positiveId(body[key], key);
    if (key === 'slug') parsed.slug = requiredString(body[key], key, { max: 100, pattern: slugPattern });
    if (key === 'name') parsed.name = requiredString(body[key], key, { max: 150 });
    if (key === 'description') parsed.description = optionalString(body[key], key, { max: 2000 });
    if (key === 'isActive') {
      if (typeof body[key] !== 'boolean') throw new ApiError(400, 'El campo isActive debe ser booleano.');
      parsed.isActive = body[key];
    }
  }
  return parsed;
}

export async function list({ includeInactive }) { return categories.listCategories({ includeInactive }); }
export async function get(idValue, options = {}) {
  const category = await categories.getCategory(positiveId(idValue), options);
  if (!category) throw new ApiError(404, 'Categoría no encontrada.');
  return category;
}
export async function create(body) {
  const parsed = parseCategory(body);
  if (parsed.parentId !== null && !(await categories.getCategory(parsed.parentId))) throw new ApiError(400, 'La categoría padre no existe.');
  return categories.insertCategory(parsed);
}
export async function update(idValue, body) {
  const id = positiveId(idValue);
  const current = await categories.getCategory(id);
  if (!current) throw new ApiError(404, 'Categoría no encontrada.');
  const partial = parseCategory(body, true);
  const updated = { ...current, ...partial };
  if (updated.parentId === id) throw new ApiError(400, 'Una categoría no puede ser su propia categoría padre.');
  if (updated.parentId !== null && !(await categories.getCategory(updated.parentId))) throw new ApiError(400, 'La categoría padre no existe.');
  if (updated.parentId !== null && await categories.parentWouldCreateCycle(id, updated.parentId)) throw new ApiError(400, 'La relación crearía un ciclo de categorías.');
  return categories.updateCategory(id, updated);
}
export async function remove(idValue) {
  const id = positiveId(idValue);
  if (!(await categories.deleteCategory(id))) throw new ApiError(404, 'Categoría no encontrada.');
}