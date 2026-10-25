import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';

test('product artwork uses the local illustration by default and a supplied image when available', async (t) => {
  const vite = await createViteServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { default: ProductArtwork } = await vite.ssrLoadModule('/src/components/ui/ProductArtwork.jsx');
  const fallback = renderToStaticMarkup(React.createElement(ProductArtwork, { product: { name: 'Judogi Azul' } }));
  assert.match(fallback, /src="\/catalog-art\/equipo\.svg"/);
  assert.match(fallback, /Ilustraci.n OJE de equipo deportivo: Judogi Azul/);
  const withImage = renderToStaticMarkup(React.createElement(ProductArtwork, { product: { name: 'Judogi Azul', imageUrl: '/catalog-art/judogi.webp' } }));
  assert.match(withImage, /src="\/catalog-art\/judogi\.webp"/);
  assert.match(withImage, /alt="Imagen de Judogi Azul"/);
  const { AdminImage } = await vite.ssrLoadModule('/src/components/admin/AdminTableTools.jsx');
  const adminImage = renderToStaticMarkup(React.createElement(AdminImage, {
    src: 'https://external.example.test/belt.webp',
    alt: 'Imagen de cinturón',
    product: { tipoProducto: { slug: 'cinturones', name: 'Cinturones' }, variantes: [{ color: 'Morado', isActive: true }] },
  }));
  assert.match(adminImage, /src="\/catalog-art\/cinturones-morado\.svg"/);
  assert.doesNotMatch(adminImage, /external\.example\.test/);
});

test('product cards pass their selected variant to the artwork fallback', async () => {
  const source = await readFile(new URL('../src/components/ui/ProductCard.jsx', import.meta.url), 'utf8');
  assert.match(source, /<ProductArtwork\s+product=\{product\}\s+variant=\{selected\}\s*\/>/);
});

test('API client includes cookies for session-based administration', async (t) => {
  const vite = await createViteServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { apiRequest } = await vite.ssrLoadModule('/src/services/api-client.js');
  const previousFetch = globalThis.fetch;
  let requestOptions;
  globalThis.fetch = async (_url, options) => { requestOptions = options; return { ok: true, json: async () => ({ data: {} }) }; };
  try { await apiRequest('/auth/me'); } finally { globalThis.fetch = previousFetch; }
  assert.equal(requestOptions.credentials, 'include');
});
