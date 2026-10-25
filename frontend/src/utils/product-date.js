export const NEW_PRODUCT_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Costa_Rica' });

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function productDate(product) { return validDate(product?.publishedAt) ?? validDate(product?.createdAt); }
export function formatProductDate(value) { return validDate(value) ? dateFormat.format(new Date(value)) : 'Fecha no disponible'; }
export function isNewProduct(product, now = new Date()) {
  const date = productDate(product);
  const elapsed = new Date(now).getTime() - (date?.getTime() ?? NaN);
  return elapsed >= 0 && elapsed < NEW_PRODUCT_WINDOW_DAYS * DAY_MS;
}
