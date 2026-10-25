import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { productDate, formatProductDate, isNewProduct, NEW_PRODUCT_WINDOW_DAYS } from '../src/utils/product-date.js';
import { reconcileCart } from '../src/utils/reconcile-cart.js';
import { notifyCatalogChange, subscribeCatalogRefresh, CATALOG_STORAGE_KEY } from '../src/services/catalog-events.js';

const variant = { id: 21, sku: 'GI-A1', size: 'A1', color: 'Azul', availableStock: 3, lowStockThreshold: 4, stockStatus: 'low' };
const product = { id: 1, slug: 'gi', name: 'Gi', estado: 'publicado', precio: 10000, imageUrl: null, variantes: [variant] };
const line = { product: { id: 1, slug: 'gi', name: 'Gi', precio: 10000, imageUrl: null }, variant: { ...variant }, quantity: 5 };

test('publication dates prefer publication, fall back safely, and use Costa Rica at the UTC date boundary', () => {
  assert.equal(productDate({ publishedAt: '2026-10-25T01:00:00Z', createdAt: '2020-01-01T00:00:00Z' }).toISOString(), '2026-10-25T01:00:00.000Z');
  const displayed = formatProductDate('2026-10-25T01:00:00Z');
  assert.match(displayed, /24/);
  assert.match(displayed, /oct/);
  assert.equal(productDate({ publishedAt: 'invalid', createdAt: '2026-10-24T12:00:00Z' }).getUTCDate(), 24);
  assert.equal(productDate({ publishedAt: null, createdAt: null }), null);
  assert.equal(formatProductDate(null), 'Fecha no disponible');
});

test('new badge excludes future dates and the exact configured expiration boundary', () => {
  const publishedAt = '2026-10-10T12:00:00Z';
  const boundary = new Date(new Date(publishedAt).getTime() + NEW_PRODUCT_WINDOW_DAYS * 86400000);
  assert.equal(isNewProduct({ publishedAt }, new Date(boundary.getTime() - 1)), true);
  assert.equal(isNewProduct({ publishedAt }, boundary), false);
  assert.equal(isNewProduct({ publishedAt }, '2026-10-09T12:00:00Z'), false);
  assert.equal(isNewProduct({}, boundary), false);
});

test('cart revalidation clamps quantity and updates price and API scarcity state', () => {
  const result = reconcileCart([line], new Map([['1', { product: { ...product, precio: 11000 } }]]));
  assert.equal(result.verified, true);
  assert.equal(result.items[0].quantity, 3);
  assert.equal(result.items[0].product.precio, 11000);
  assert.equal(result.items[0].variant.stockStatus, 'low');
  assert.equal(result.changes.length, 2);
});

test('unpublished, removed, inactive and exhausted variants leave the cart with an explanation', () => {
  for (const response of [{ missing: true }, { product: { ...product, estado: 'borrador' } }, { product: { ...product, variantes: [] } }, { product: { ...product, variantes: [{ ...variant, isActive: false }] } }, { product: { ...product, variantes: [{ ...variant, availableStock: 0 }] } }]) {
    const result = reconcileCart([line], new Map([['1', response]]));
    assert.equal(result.items.length, 0);
    assert.match(result.changes[0], /retirado/);
  }
});

test('network failure preserves cart and blocks verification instead of treating it as sold out', () => {
  const result = reconcileCart([line], new Map([['1', { error: true }]]));
  assert.equal(result.verified, false);
  assert.equal(result.items[0], line);
  assert.equal(result.changes.length, 0);
});

test('unchanged data retains cart line identity after refresh', () => {
  const input = reconcileCart([line], new Map([['1', { product }]])).items;
  const result = reconcileCart(input, new Map([['1', { product }]]));
  assert.equal(result.items[0], input[0]);
  assert.equal(result.changes.length, 0);
});

test('focus, visibility and admin changes refresh subscribers, including same-origin tab signals', t => {
  const keys = ['addEventListener','removeEventListener','dispatchEvent','document','localStorage'];
  const originals = new Map(keys.map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const events = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const saved = new Map();
  for (const method of ['addEventListener','removeEventListener','dispatchEvent']) Object.defineProperty(globalThis,method,{ value:events[method].bind(events), configurable:true });
  Object.defineProperty(globalThis,'document',{ value:document, configurable:true });
  Object.defineProperty(globalThis,'localStorage',{ value:{ setItem:(key,value)=>saved.set(key,value) }, configurable:true });
  t.after(() => { for (const [key,descriptor] of originals) descriptor ? Object.defineProperty(globalThis,key,descriptor) : delete globalThis[key]; });
  let count = 0;
  const unsubscribe = subscribeCatalogRefresh(() => count++);
  notifyCatalogChange(); assert.equal(count,1); assert.ok(saved.has(CATALOG_STORAGE_KEY));
  events.dispatchEvent(new Event('focus')); assert.equal(count,2);
  document.visibilityState = 'hidden'; events.dispatchEvent(new Event('focus')); assert.equal(count,2);
  document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange')); assert.equal(count,3);
  events.dispatchEvent(Object.assign(new Event('storage'),{ key:CATALOG_STORAGE_KEY })); assert.equal(count,4);
  unsubscribe(); events.dispatchEvent(new Event('focus')); assert.equal(count,4);
});

test('stock labels use API scarcity status and include quantities without relying on color', async t => {
  const vite = await createServer({ configFile:false, plugins:[react()], server:{ middlewareMode:true,ws:false,hmr:false }, appType:'custom' });
  t.after(() => vite.close());
  const { default: StockStatus } = await vite.ssrLoadModule('/src/components/ui/StockStatus.jsx');
  assert.match(renderToStaticMarkup(React.createElement(StockStatus,{ variant })), /¡Quedan pocas unidades! 3 unidades/);
  assert.match(renderToStaticMarkup(React.createElement(StockStatus,{ variant:{...variant,availableStock:0} })), /Agotado · 0 unidades/);
  assert.match(renderToStaticMarkup(React.createElement(StockStatus,{ variant:{...variant,stockStatus:'available',availableStock:1} })), /Disponible: 1 unidad/);
});

test('malformed product success does not remove saved articles as if they were missing', async t => {
  const vite = await createServer({ configFile:false, plugins:[react()], server:{ middlewareMode:true,ws:false,hmr:false }, appType:'custom' });
  t.after(() => vite.close());
  const { getProduct } = await vite.ssrLoadModule('/src/services/product-service.js');
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => ({ ok:true, json:async()=>({}) });
  await assert.rejects(() => getProduct(1),error=>error.status===0);
});
