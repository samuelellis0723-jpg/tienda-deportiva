import * as products from '../models/productModel.js';
import * as categories from '../models/categoryModel.js';
import { ApiError } from '../utils/errors.js';
import { nonNegativeInteger, optionalBoolean, optionalString, positiveId, positiveMoney, rejectUnknownFields, requireObject, requiredString } from '../utils/validation.js';

const fields = ['sku', 'slug', 'name', 'description', 'imageUrl', 'price', 'currency', 'categoryIds', 'variants'];
const skuPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const variantFields = ['id', 'sku', 'size', 'color', 'stock', 'isActive'];

function parseImageUrl(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048 || /\s/.test(value.trim())) {
    throw new ApiError(400, 'El campo imageUrl debe ser una URL HTTP(S) válida de hasta 2048 caracteres.');
  }
  let parsed;
  try { parsed = new URL(value.trim()); } catch { throw new ApiError(400, 'El campo imageUrl debe ser una URL HTTP(S) válida.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new ApiError(400, 'El campo imageUrl debe ser una URL HTTP(S) válida sin credenciales.');
  }
  return parsed.toString();
}

function parseVariants(value) {
  if (!Array.isArray(value)) throw new ApiError(400, 'variants debe ser una lista.');
  const skus = new Set();
  const options = new Set();
  return value.map((item, index) => {
    const body = requireObject(item);
    rejectUnknownFields(body, variantFields);
    const variant = {
      sku: requiredString(body.sku, `variants[${index}].sku`, { max: 80, pattern: skuPattern }),
      size: requiredString(body.size, `variants[${index}].size`, { max: 40 }),
      color: body.color === undefined ? 'Único' : requiredString(body.color, `variants[${index}].color`, { max: 60 }),
      stock: nonNegativeInteger(body.stock, `variants[${index}].stock`),
      isActive: body.isActive === undefined ? true : optionalBoolean(body.isActive, `variants[${index}].isActive`),
    };
    if (body.id !== undefined) variant.id = positiveId(body.id, `variants[${index}].id`);
    if (skus.has(variant.sku)) throw new ApiError(400, 'No repitas el SKU de una variante.');
    const option = `${variant.size.toLocaleLowerCase()}\u0000${variant.color.toLocaleLowerCase()}`;
    if (options.has(option)) throw new ApiError(400, 'No repitas la combinación de talla y color.');
    skus.add(variant.sku);
    options.add(option);
    return variant;
  });
}

function parseProduct(input, partial = false) {
  const body = requireObject(input);
  rejectUnknownFields(body, fields);
  if (partial && Object.keys(body).length === 0) throw new ApiError(400, 'Envía al menos un campo para actualizar.');
  const parsed = {};
  const required = ['sku', 'slug', 'name', 'price'];
  if (!partial) for (const key of required) if (!(key in body)) throw new ApiError(400, `Falta el campo requerido: ${key}.`);
  if ('sku' in body) parsed.sku = requiredString(body.sku, 'sku', { max: 80, pattern: skuPattern });
  if ('slug' in body) parsed.slug = requiredString(body.slug, 'slug', { max: 120, pattern: slugPattern });
  if ('name' in body) parsed.name = requiredString(body.name, 'name', { max: 200 });
  if ('description' in body) parsed.description = optionalString(body.description, 'description');
  else if (!partial) parsed.description = null;
  if ('imageUrl' in body) parsed.imageUrl = parseImageUrl(body.imageUrl);
  else if (!partial) parsed.imageUrl = null;
  if ('price' in body) parsed.price = positiveMoney(body.price, 'price');
  if ('currency' in body) {
    parsed.currency = requiredString(body.currency, 'currency', { max: 3, pattern: /^[A-Z]{3}$/ });
    if (parsed.currency !== 'CRC') throw new ApiError(400, 'Por ahora solo se admite CRC.');
  } else if (!partial) parsed.currency = 'CRC';
  if ('categoryIds' in body) {
    if (!Array.isArray(body.categoryIds)) throw new ApiError(400, 'categoryIds debe ser una lista.');
    parsed.categoryIds = body.categoryIds.map((id) => positiveId(id, 'categoryIds'));
    if (new Set(parsed.categoryIds).size !== parsed.categoryIds.length) throw new ApiError(400, 'No repitas categorías.');
  } else if (!partial) parsed.categoryIds = [];
  if ('variants' in body) parsed.variants = parseVariants(body.variants);
  else if (!partial) parsed.variants = [];
  return parsed;
}

function mergeProduct(current, patch) {
  return {
    sku: patch.sku ?? current.sku,
    slug: patch.slug ?? current.slug,
    name: patch.name ?? current.name,
    description: patch.description === undefined ? current.description : patch.description,
    imageUrl: patch.imageUrl === undefined ? (current.imageUrl ?? null) : patch.imageUrl,
    price: patch.price ?? Number(current.precio),
    currency: patch.currency ?? current.moneda,
    categoryIds: patch.categoryIds,
    variants: patch.variants,
  };
}

async function parseQuery(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'page debe ser positivo y limit debe estar entre 1 y 100.');
  const sort = query.ordenar ?? 'reciente';
  if (typeof sort !== 'string') throw new ApiError(400, 'El campo ordenar no está permitido.');
  const validSorts = ['reciente', 'nombre', 'precio', 'created_at', 'name', 'price'];
  if (!validSorts.includes(sort)) throw new ApiError(400, 'El campo ordenar no está permitido.');
  const rawDirection = query.direccion ?? 'desc';
  if (typeof rawDirection !== 'string') throw new ApiError(400, 'direccion debe ser asc o desc.');
  const direction = rawDirection.toLowerCase();
  if (!['asc', 'desc'].includes(direction)) throw new ApiError(400, 'direccion debe ser asc o desc.');
  let status = null;
  if (query.estado !== undefined) {
    if (typeof query.estado !== 'string' || !['borrador', 'publicado'].includes(query.estado)) throw new ApiError(400, 'estado debe ser borrador o publicado.');
    status = query.estado;
  }
  let available = null;
  if (query.disponible !== undefined) {
    if (!['true', 'false'].includes(query.disponible)) throw new ApiError(400, 'disponible debe ser true o false.');
    available = query.disponible === 'true';
  }
  let categoryId;
  if (query.categoria !== undefined) {
    if (typeof query.categoria !== 'string') throw new ApiError(400, 'La categoría indicada no es válida.');
    const category = /^\d+$/.test(query.categoria)
      ? await categories.getCategory(positiveId(query.categoria, 'categoria'))
      : (await categories.listCategories({ includeInactive: true })).find((item) => item.slug === query.categoria);
    if (!category) throw new ApiError(400, 'La categoría indicada no existe.');
    categoryId = category.id;
  }
  return {
    q: query.q === undefined ? undefined : requiredString(query.q, 'q', { max: 120 }),
    categoryId,
    status,
    available,
    sort,
    direction,
    page,
    limit,
  };
}

export async function list(query, { includeInactiveRelations = false } = {}) {
  const parsed = await parseQuery(query);
  const result = await products.listProducts({ ...parsed, includeInactiveRelations, offset: (parsed.page - 1) * parsed.limit });
  return { data: result.data, meta: { page: parsed.page, limit: parsed.limit, total: result.total } };
}

export async function get(idValue, options = {}) {
  const product = await products.getProduct(positiveId(idValue), { ...options, includeInactiveRelations: Boolean(options.admin) });
  if (!product) throw new ApiError(404, 'Producto no encontrado.');
  return product;
}
export async function create(body) {
  const parsed = parseProduct(body);
  const id = await products.insertProduct(parsed);
  return products.getProduct(id);
}
export async function update(idValue, body) {
  const id = positiveId(idValue);
  const current = await products.getProduct(id);
  if (!current) throw new ApiError(404, 'Producto no encontrado.');
  const patch = parseProduct(body, true);
  const updated = await products.updateProduct(id, mergeProduct(current, patch));
  if (!updated) throw new ApiError(404, 'Producto no encontrado.');
  return products.getProduct(id);
}
export async function remove(idValue) {
  const id = positiveId(idValue);
  if (!(await products.deleteProduct(id))) throw new ApiError(404, 'Producto no encontrado.');
}
export async function publish(idValue) {
  const id = positiveId(idValue);
  if (!(await products.setProductPublished(id, true))) throw new ApiError(404, 'Producto no encontrado.');
  return products.getProduct(id);
}
export async function unpublish(idValue) {
  const id = positiveId(idValue);
  if (!(await products.setProductPublished(id, false))) throw new ApiError(404, 'Producto no encontrado.');
  return products.getProduct(id);
}
