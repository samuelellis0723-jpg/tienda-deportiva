import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { availableStock } from '../src/utils/format.js';
import { cartQuantity } from '../src/utils/cart-quantity.js';

test('availability uses inventory subtraction, never physical stock alone', () => {
  assert.equal(availableStock({ on_hand: 12, reserved: 5, availableStock: 12 }), 7);
  assert.equal(availableStock({ on_hand: 2, reserved: 4 }), 0);
  assert.equal(availableStock({ availableStock: 6 }), 6);
  assert.equal(availableStock({ stock: 100 }), 0);
});

test('cart quantities are integers within availability, including persisted input', () => {
  assert.equal(cartQuantity(1.5, 8), 1);
  assert.equal(cartQuantity(100, 8), 8);
  assert.equal(cartQuantity(-4, 8), 1);
  assert.equal(cartQuantity('invalid', 8), 1);
  assert.equal(cartQuantity(4, 0), 0);
});

test('catalog preserves server pagination beyond the first hundred products', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { getProductPage } = await vite.ssrLoadModule('/src/services/product-service.js');
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async url => { requested = url; return { ok: true, json: async () => ({ data: [{ id: 145 }], meta: { total: 145, page: 13, limit: 12 } }) }; };
  try {
    const result = await getProductPage({ page: '13', limit: '12', categoria: 'bjj' });
    assert.match(requested, /page=13/);
    assert.match(requested, /categoria=bjj/);
    assert.equal(result.meta.total, 145);
    assert.equal(result.data[0].id, 145);
  } finally { globalThis.fetch = original; }
});

test('dashboard product catalog mirrors all published store pages', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { listStoreProducts } = await vite.ssrLoadModule('/src/services/dashboard-service.js');
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url, 'http://localhost');
    requests.push(parsed);
    const page = Number(parsed.searchParams.get('page'));
    return { ok: true, json: async () => page === 1
      ? { data: [{ id: 1 }, { id: 2 }], meta: { total: 3 } }
      : { data: [{ id: 3 }], meta: { total: 3 } } };
  };
  try {
    const products = await listStoreProducts();
    assert.deepEqual(products.map(product => product.id), [1, 2, 3]);
    assert.deepEqual(requests.map(request => request.searchParams.get('page')), ['1', '2']);
    assert.equal(requests[0].searchParams.get('limit'), '100');
  } finally { globalThis.fetch = original; }
});

test('orders send stable idempotency headers with the original payload', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { createOrder } = await vite.ssrLoadModule('/src/services/order-service.js');
  const original = globalThis.fetch;
  const attempts = [];
  globalThis.fetch = async (_url, options) => { attempts.push(options); return { ok: true, json: async () => ({ data: { id: 1, total: 2000 } }) }; };
  try {
    const payload = { items: [{ variantId: 3, quantity: 2 }] };
    await createOrder(payload, 'same-attempt');
    await createOrder(payload, 'same-attempt');
    assert.equal(attempts[0].headers['Idempotency-Key'], attempts[1].headers['Idempotency-Key']);
    assert.equal(attempts[0].body, JSON.stringify(payload));
    assert.equal(attempts[0].credentials, 'include');
  } finally { globalThis.fetch = original; }
});

test('an incomplete order response remains an uncertain result, never a confirmation', async t => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => vite.close());
  const { createOrder } = await vite.ssrLoadModule('/src/services/order-service.js');
  const original = globalThis.fetch;
  try {
    for (const data of [undefined, { id: 3 }, { total: 100 }, { id: 3, total: 'invalid' }]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ data }) });
      await assert.rejects(() => createOrder({}, 'attempt'), error => error.status === 0);
    }
  } finally { globalThis.fetch = original; }
});
