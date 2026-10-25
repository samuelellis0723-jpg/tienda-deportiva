export const SPORTS = [
  { slug: 'judo', label: 'Judo' },
  { slug: 'bjj', label: 'BJJ' },
];

export const PRODUCT_TYPE_ROOT = 'uniformes';
export const TYPE_ALIASES = { 'judo-gi': 'kimonos', 'bjj-gi': 'kimonos', rashguard: 'camisas' };

export function sportCategories(categories = []) {
  return categories.filter((category) => SPORTS.some((sport) => sport.slug === category.slug));
}

export function productTypeCategories(categories = []) {
  const root = categories.find((category) => category.slug === PRODUCT_TYPE_ROOT && category.parentId == null);
  const canonicalTypes = root ? categories.filter((category) => String(category.parentId) === String(root.id)) : [];
  if (canonicalTypes.length) return canonicalTypes;
  const ids = new Set(sportCategories(categories).map((category) => String(category.id)));
  return categories.filter((category) => ids.has(String(category.parentId)));
}

export function canonicalTypeSlug(slug = '') { return TYPE_ALIASES[slug] ?? slug; }

export function productTypeImage(type, color = '') {
  const slug = canonicalTypeSlug(typeof type === 'string' ? type : type?.slug);
  if (slug === 'cinturones') {
    const colorSlug = String(color).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!colorSlug || colorSlug === 'negro' || colorSlug === 'negro-barra-blanca') return '/catalog-art/cinturon-fuji-blanco-negro.webp';
    if (['azul', 'blanco', 'marron', 'morado'].includes(colorSlug)) return `/catalog-art/cinturones-${colorSlug}.svg`;
  }
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? `/catalog-art/${slug}.svg` : '/catalog-art/equipo.svg';
}

export function safeProductImage(value, origin = (typeof globalThis.location === 'undefined' ? null : globalThis.location.origin)) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const source = value.trim();
  if (/^\/catalog-art\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|webp|png|jpe?g)$/.test(source)) return source;
  if (!origin) return null;
  let parsed;
  try { parsed = new URL(source); } catch { return null; }
  if (parsed.origin !== origin || !['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
  const localDevelopment = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  return parsed.protocol === 'https:' || localDevelopment ? parsed.toString() : null;
}

export function sportsOf(product) {
  const slugs = Array.isArray(product?.deportes)
    ? product.deportes
    : (product?.categorias ?? product?.categories ?? []).filter((category) => SPORTS.some((sport) => sport.slug === category.slug)).map((category) => category.slug);
  return SPORTS.filter((sport) => slugs.includes(sport.slug));
}

export function productTypeOf(product) {
  const type = product?.tipoProducto;
  if (type?.name) return TYPE_ALIASES[type.slug] ? ({ kimonos: 'Kimonos', camisas: 'Camisas' }[TYPE_ALIASES[type.slug]] ?? type.name) : type.name;
  const categories = product?.categorias ?? product?.categories ?? [];
  const roots = new Set(SPORTS.map((sport) => categories.find((category) => category.slug === sport.slug)?.id).filter(Boolean).map(String));
  return categories.find((category) => roots.has(String(category.parentId)))?.name ?? '';
}

export function categoryHref(category, sportSlug) {
  const params = new URLSearchParams();
  if (sportSlug) params.set('deporte', sportSlug);
  params.set('tipo', category.slug);
  return `/catalogo?${params}`;
}
