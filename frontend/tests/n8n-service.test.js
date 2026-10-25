import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('n8n webhook resolution preserves a configured external production URL', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { resolveWebhookUrl } = await vite.ssrLoadModule('/src/services/n8n-service.js');
  assert.equal(resolveWebhookUrl('', { isDev: true }), '/n8n/webhook/oje-assistant');
  assert.equal(resolveWebhookUrl('', { isDev: false }), '');
  assert.equal(resolveWebhookUrl('/n8n', { isDev: false }), '/n8n/webhook/oje-assistant');
  assert.equal(resolveWebhookUrl('https://automation.example/webhook/oje-assistant', { isDev: false }), 'https://automation.example/webhook/oje-assistant');
  assert.equal(resolveWebhookUrl('https://automation.example', { isDev: false }), 'https://automation.example/webhook/oje-assistant');
  assert.equal(resolveWebhookUrl('javascript:alert(1)', { isDev: false }), '');
});

test('description and cart recommendation actions send their contracts to n8n', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { generateProductDescription, recommendProducts } = await vite.ssrLoadModule('/src/services/n8n-service.js');
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const data = requests.length === 1 ? { description: 'Judogi para acompañar tu práctica.' } : { products: [{ id: 27, name: 'Cinturón' }] };
    return { ok: true, json: async () => ({ ok: true, data, error: null }) };
  };
  try {
    assert.equal(await generateProductDescription({ name: 'Judogi', category: 'Kimonos' }), 'Judogi para acompañar tu práctica.');
    const cartItems = [{ productId: 12, name: 'Judogi azul', size: 'A2', color: 'Azul', quantity: 1 }];
    assert.deepEqual(await recommendProducts(cartItems), [{ id: 27, name: 'Cinturón' }]);
    assert.deepEqual(requests[0], { action: 'description', name: 'Judogi', category: 'Kimonos', features: [] });
    assert.deepEqual(requests[1], { action: 'recommend', items: cartItems });
  } finally { globalThis.fetch = original; }
});
