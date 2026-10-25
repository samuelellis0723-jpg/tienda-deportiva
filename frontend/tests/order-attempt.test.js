import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderAttempt } from '../src/services/order-attempt.js';

test('an uncertain response retains the same key and immutable payload on retry', async () => {
  const requests = [];
  const attempt = createOrderAttempt(async (payload,key) => {
    requests.push({ payload, key });
    if (requests.length === 1) throw new Error('connection lost');
    return { id: 7, total: 2000 };
  }, () => 'original-key');
  const order = { customer: { email: 'buyer@example.test' }, items: [{ variantId: 3, quantity: 1 }] };
  await assert.rejects(attempt.run(order), /connection lost/);
  order.items[0].quantity = 10;
  await attempt.run({ items: [] });
  assert.equal(requests[0].key, requests[1].key);
  assert.equal(requests[1].payload.items[0].quantity, 1);
  assert.equal(attempt.snapshot, null);
});

test('parallel sends share one in-flight request', async () => {
  let resolve;
  let calls = 0;
  const attempt = createOrderAttempt(() => { calls++; return new Promise(done => { resolve = done; }); }, () => 'single-key');
  const first = attempt.run({ items: [] });
  const second = attempt.run({ items: [{ variantId: 5 }] });
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(first, second);
  resolve({ id: 1, total: 0 });
  await first;
});

test('a definitive rejection permits a corrected order with a new key', async () => {
  let keys = 0;
  const attempt = createOrderAttempt(async () => { const error = new Error('stock changed'); error.status = 409; throw error; }, () => `key-${++keys}`);
  await assert.rejects(attempt.run({ items: [1] }), /stock changed/);
  assert.equal(attempt.snapshot, null);
  await assert.rejects(attempt.run({ items: [2] }), /stock changed/);
  assert.equal(keys, 2);
});
