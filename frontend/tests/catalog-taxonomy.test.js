import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryHref, productTypeCategories, productTypeImage, productTypeOf, safeProductImage, sportCategories, sportsOf } from '../src/utils/catalog-taxonomy.js';
import { readFile } from 'node:fs/promises';

const categories = [
  { id: '1', parentId: null, slug: 'judo', name: 'Judo' },
  { id: '2', parentId: null, slug: 'bjj', name: 'BJJ' },
  { id: '5', parentId: '1', slug: 'judo-gi', name: 'Judogi' },
  { id: '6', parentId: '2', slug: 'bjj-gi', name: 'BJJ Gi' },
  { id: '3', parentId: null, slug: 'uniformes', name: 'Uniformes' },
  { id: '7', parentId: '3', slug: 'kimonos', name: 'Kimonos' },
  { id: '8', parentId: '3', slug: 'cinturones', name: 'Cinturones' },
  { id: '9', parentId: '3', slug: 'conjuntos-entrenamiento', name: 'Conjuntos de entrenamiento' },
  { id: '10', parentId: '3', slug: 'camisas', name: 'Camisas' },
  { id: '11', parentId: '3', slug: 'sudaderas', name: 'Sudaderas / suéteres' },
  { id: '12', parentId: '3', slug: 'medias', name: 'Medias OJE' },
];

test('sports and product types derive from the existing category hierarchy', () => {
  assert.deepEqual(sportCategories(categories).map(item => item.slug), ['judo', 'bjj']);
  assert.deepEqual(productTypeCategories(categories).map(item => item.slug), ['kimonos', 'cinturones', 'conjuntos-entrenamiento', 'camisas', 'sudaderas', 'medias']);
  assert.deepEqual(sportsOf({ deportes: ['bjj', 'judo'] }).map(item => item.slug), ['judo', 'bjj']);
  assert.equal(productTypeOf({ tipoProducto: { slug: 'judo-gi', name: 'Judogi' } }), 'Kimonos');
  assert.equal(categoryHref(categories[2], 'judo'), '/catalogo?deporte=judo&tipo=judo-gi');
  assert.equal(categoryHref(categories[5]), '/catalogo?tipo=kimonos');
  assert.equal(productTypeImage(categories[10]), '/catalog-art/medias.svg');
  assert.equal(productTypeImage(categories[6], 'Morado'), '/catalog-art/cinturones-morado.svg');
  assert.equal(productTypeImage(categories[6]), '/catalog-art/cinturon-fuji-blanco-negro.webp');
  assert.equal(productTypeImage(categories[6], 'Negro, barra blanca'), '/catalog-art/cinturon-fuji-blanco-negro.webp');
  assert.equal(safeProductImage('https://external.example.test/image.webp', 'https://oje.example.test'), null);
  assert.equal(safeProductImage('https://oje.example.test/catalog-art/image.webp', 'https://oje.example.test'), 'https://oje.example.test/catalog-art/image.webp');
});

test('products can belong to both sports and legacy unassigned items are detectable', () => {
  assert.deepEqual(sportsOf({ deportes: ['judo', 'bjj'] }).map(item => item.label), ['Judo', 'BJJ']);
  assert.deepEqual(sportsOf({ deportes: [] }), []);
});

test('every requested catalog type has a local original SVG fallback', async () => {
  for (const type of productTypeCategories(categories)) {
    const svg = await readFile(new URL(`../public/catalog-art/${type.slug}.svg`, import.meta.url), 'utf8');
    assert.match(svg, /<svg[^>]+viewBox="0 0 640 480"/);
    assert.match(svg, /Ilustraci.n vectorial original OJE/);
  }
});
