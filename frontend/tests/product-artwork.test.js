import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';

test('product artwork renders a named fallback without an image and accessible image alt text with imageUrl', async (t) => {
  const vite = await createViteServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { default: ProductArtwork } = await vite.ssrLoadModule('/src/components/ui/ProductArtwork.jsx');
  const fallback = renderToStaticMarkup(React.createElement(ProductArtwork, { product: { name: 'Judogi Azul' } }));
  assert.match(fallback, /artwork-placeholder/);
  assert.match(fallback, /Imagen ilustrativa de Judogi Azul/);
  const withImage = renderToStaticMarkup(React.createElement(ProductArtwork, { product: { name: 'Judogi Azul', imageUrl: 'https://cdn.example.test/judogi.webp' } }));
  assert.match(withImage, /src="https:\/\/cdn\.example\.test\/judogi\.webp"/);
  assert.match(withImage, /alt="Imagen del producto Judogi Azul"/);
});

test('API client includes cookies for session-based administration', async (t) => {
  const vite = await createViteServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' });
  t.after(() => vite.close());
  const { apiRequest } = await vite.ssrLoadModule('/src/services/api-client.js');
  const previousFetch = globalThis.fetch;
  let requestOptions;
  globalThis.fetch = async (_url, options) => { requestOptions = options; return { ok: true, json: async () => ({ data: {} }) }; };
  try { await apiRequest('/auth/me'); } finally { globalThis.fetch = previousFetch; }
  assert.equal(requestOptions.credentials, 'include');
});
