import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';

class Mutex {
  tail = Promise.resolve();
  async acquire() {
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const previous = this.tail;
    this.tail = current;
    await previous;
    return release;
  }
}

test('checkout, inventory locking, coupon limits, order transitions and cancellation', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  const now = Date.now();
  const couponSeed = (id, code, expiresAt, usageLimit = 20) => ({
    id, code, discountType: 'percent', discountValue: '10.00', startsAt: new Date(now - 86400000),
    expiresAt: new Date(expiresAt), usageLimit, perCustomerLimit: 1, minimumSubtotal: '0', isActive: true,
  });
  let state = {
    customers: new Map([['used@example.test', { id: 900, email: 'used@example.test', firstName: 'Already', lastName: 'Used', phone: null }]]),
    cities: new Map([[1, { id: 1, name: 'San José', province: 'San José', shippingCost: 1800, isActive: true }], [2, { id: 2, name: 'No Coverage', province: 'Limón', shippingCost: 5000, isActive: false }]]),
    coupons: new Map([
      ['JUDO10', couponSeed(10, 'JUDO10', now + 86400000)],
      ['EXPIRED', couponSeed(11, 'EXPIRED', now - 1000)],
      ['SOLDOUT', couponSeed(12, 'SOLDOUT', now + 86400000, 1)],
      ['USED', couponSeed(13, 'USED', now + 86400000)],
      ['ONEUSE', couponSeed(14, 'ONEUSE', now + 86400000, 1)],
    ]),
    redemptions: [
      { couponId: 12, customerId: 901, status: 'redeemed' },
      { couponId: 13, customerId: 900, status: 'redeemed' },
    ],
    variants: new Map([
      [11, { variantId: 11, sku: 'OJE-TEST-LOW', size: 'A1', color: 'White', productName: 'Judo Gi', unitPrice: '18500.00', onHand: 8, reserved: 0, active: true, published: true }],
      [12, { variantId: 12, sku: 'OJE-TEST-HIGH', size: 'M', color: 'Blue', productName: 'BJJ Gi', unitPrice: '50000.00', onHand: 8, reserved: 0, active: true, published: true }],
      [13, { variantId: 13, sku: 'OJE-TEST-LAST', size: 'A2', color: 'White', productName: 'Rashguard', unitPrice: '12000.00', onHand: 1, reserved: 0, active: true, published: true }],
    ]),
    orders: new Map(), items: new Map(), events: new Map(), payments: new Map(), shipments: new Map(), audits: [],
    nextCustomer: 1000, nextOrder: 1, nextItem: 1, nextRedemption: 1,
  };
  const mutex = new Mutex();
  const originalConnect = pool.connect.bind(pool);
  const originalQuery = pool.query.bind(pool);
  let failOrderItems = false;

  const runQuery = async (db, sql, values = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.includes('FROM auth_sessions s')) return { rows: [{ id: 81, email: 'admin@example.test', expiresAt: new Date(Date.now() + 3600000) }], rowCount: 1 };
    if (normalized.includes('pg_advisory_xact_lock')) return { rows: [{ pg_advisory_xact_lock: null }], rowCount: 1 };
    if (/SELECT id, idempotency_fingerprint AS fingerprint FROM orders/.test(normalized)) {
      const row = [...db.orders.values()].find((order) => order.idempotencyKey === values[0]);
      return { rows: row ? [{ id: row.id, fingerprint: row.fingerprint }] : [], rowCount: row ? 1 : 0 };
    }
    if (/INSERT INTO customers/.test(normalized)) {
      const [email, firstName, lastName, phone] = values;
      let customer = db.customers.get(email);
      if (!customer) { customer = { id: db.nextCustomer++, email, firstName, lastName, phone }; db.customers.set(email, customer); }
      else return { rows: [], rowCount: 0 };
      return { rows: [{ id: customer.id }], rowCount: 1 };
    }
    if (/SELECT id FROM customers WHERE email=\$1/.test(normalized)) {
      const customer = db.customers.get(values[0]); return { rows: customer ? [{ id: customer.id }] : [], rowCount: customer ? 1 : 0 };
    }
    if (/FROM cities WHERE id=\$1 FOR SHARE/.test(normalized)) {
      const city = db.cities.get(values[0]); return { rows: city ? [{ ...city }] : [], rowCount: city ? 1 : 0 };
    }
    if (/setting_key='free_shipping_threshold_crc'/.test(normalized)) return { rows: [{ amount: '35000' }], rowCount: 1 };
    if (/setting_key='coupon_restore_on_cancel'/.test(normalized)) return { rows: [{ setting_value: { enabled: true, only_before_shipment: true, only_if_coupon_current: true } }], rowCount: 1 };
    if (/FROM coupons WHERE code=\$1 FOR UPDATE/.test(normalized)) {
      const coupon = db.coupons.get(values[0]); return { rows: coupon ? [{ ...coupon }] : [], rowCount: coupon ? 1 : 0 };
    }
    if (/FROM coupon_redemptions WHERE coupon_id=\$1/.test(normalized)) {
      const redemptions = db.redemptions.filter((r) => r.couponId === values[0] && r.status === 'redeemed');
      return { rows: [{ total: redemptions.length, customer_total: redemptions.filter((r) => r.customerId === values[1]).length }], rowCount: 1 };
    }
    if (/FROM product_variants v JOIN products p.*JOIN inventory i/.test(normalized)) {
      const rows = values[0].map((id) => db.variants.get(Number(id))).filter((v) => v?.active && v?.published).map((v) => ({ ...v }));
      return { rows, rowCount: rows.length };
    }
    if (/UPDATE inventory SET on_hand=on_hand-/.test(normalized)) {
      const variant = db.variants.get(Number(values[0]));
      if (!variant || variant.onHand - variant.reserved < values[1]) return { rows: [], rowCount: 0 };
      variant.onHand -= values[1]; return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO orders/.test(normalized)) {
      const [orderNumber, customerId, subtotal, discountTotal, shippingTotal, total, couponId, cityName, province, address, shippingSnapshot, idempotencyKey, fingerprint] = values;
      const id = db.nextOrder++;
      const customer = [...db.customers.values()].find((c) => c.id === customerId);
      db.orders.set(id, { id, publicId: `public-${id}`, orderNumber, status: 'pending_payment', currency: 'CRC', subtotal, discountTotal, shippingTotal, taxTotal: 0, total, shippingCityName: cityName, shippingProvince: province, shippingAddressLine: address, shippingCost: shippingSnapshot, placedAt: new Date(), shippedAt: null, cancelledAt: null, idempotencyKey, fingerprint, customerId, couponId, customer });
      return { rows: [{ id }], rowCount: 1 };
    }
    if (/INSERT INTO order_items/.test(normalized)) {
      if (failOrderItems) throw new Error('simulated failure after stock decrement');
      const [orderId, variantId, productName, sku, variant, quantity, unitPrice, lineTotal] = values;
      const items = db.items.get(orderId) ?? [];
      items.push({ id: db.nextItem++, variantId, productName, sku, variant, quantity, unitPrice, lineTotal });
      db.items.set(orderId, items); return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO coupon_redemptions/.test(normalized)) {
      const [couponId, customerId, orderId] = values;
      const redemption = { id: db.nextRedemption++, couponId, customerId, orderId, status: 'redeemed', isActive: true, startsAt: new Date(now - 86400000), expiresAt: new Date(now + 86400000) };
      db.redemptions.push(redemption); return { rows: [], rowCount: 1 };
    }
    if (/INSERT INTO order_events/.test(normalized)) {
      const orderId = values[0]; const events = db.events.get(orderId) ?? [];
      const paymentConfirmation = normalized.includes("VALUES ($1,'pending_payment','pending_payment',$2)");
      events.push(paymentConfirmation
        ? { from: 'pending_payment', to: 'pending_payment', note: values[1], at: new Date() }
        : { from: values[1] ?? null, to: values[2] ?? 'pending_payment', note: values[2] === undefined ? 'created' : 'changed', at: new Date() });
      db.events.set(orderId, events); return { rows: [], rowCount: 1 };
    }
    if (/FROM orders o JOIN customers cu/.test(normalized) && /WHERE o.id=\$1/.test(normalized)) {
      const order = db.orders.get(Number(values[0]));
      if (!order) return { rows: [], rowCount: 0 };
      const coupon = [...db.coupons.values()].find((c) => c.id === order.couponId);
      return { rows: [{ ...order, couponCode: coupon?.code ?? null, items: db.items.get(order.id) ?? [], events: db.events.get(order.id) ?? [], payments: db.payments.get(order.id) ?? [], shipment: db.shipments.get(order.id) ?? null }], rowCount: 1 };
    }
    if (/SELECT id FROM orders WHERE id=\$1/.test(normalized)) {
      const order = db.orders.get(Number(values[0])); return { rows: order ? [{ id: order.id }] : [], rowCount: order ? 1 : 0 };
    }
    if (/SELECT count\(\*\).*FROM orders/.test(normalized)) return { rows: [{ total: db.orders.size }], rowCount: 1 };
    if (/FROM orders o JOIN customers cu/.test(normalized)) return { rows: [], rowCount: 0 };
    if (/SELECT id,status,coupon_id FROM orders/.test(normalized)) {
      const order = db.orders.get(Number(values[0])); return { rows: order ? [{ id: order.id, status: order.status, coupon_id: order.couponId }] : [], rowCount: order ? 1 : 0 };
    }
    if (/SELECT id,status,total,currency FROM orders/.test(normalized)) {
      const order = db.orders.get(Number(values[0])); return { rows: order ? [{ id: order.id, status: order.status, total: order.total, currency: order.currency }] : [], rowCount: order ? 1 : 0 };
    }
    if (/INSERT INTO payments/.test(normalized)) {
      const [orderId, reference, amount, currency] = values;
      const payments = db.payments.get(Number(orderId)) ?? [];
      const payment = { id: payments.length + 1, orderId, provider: 'manual', reference, status: 'paid', amount, currency, createdAt: new Date() };
      payments.push(payment); db.payments.set(Number(orderId), payments);
      return { rows: [payment], rowCount: 1 };
    }
    if (/SELECT id,status FROM orders/.test(normalized)) {
      const order = db.orders.get(Number(values[0])); return { rows: order ? [{ id: order.id, status: order.status }] : [], rowCount: order ? 1 : 0 };
    }
    if (/FROM payments WHERE order_id=\$1 AND status='paid'/.test(normalized)) return { rows: db.payments.get(Number(values[0]))?.filter((p) => p.status === 'paid') ?? [], rowCount: (db.payments.get(Number(values[0])) ?? []).filter((p) => p.status === 'paid').length };
    if (/UPDATE orders SET status=\$2/.test(normalized)) {
      const order = db.orders.get(Number(values[0])); order.status = values[1]; if (values[1] === 'shipped') order.shippedAt = new Date(); return { rows: [], rowCount: 1 };
    }
    if (/UPDATE shipments SET status='delivered'/.test(normalized)) return { rows: [], rowCount: 0 };
    if (/INSERT INTO audit_log/.test(normalized)) {
      const action = normalized.match(/VALUES \(\$1,'([^']+)'/)?.[1];
      db.audits.push({ action, resourceId: values[1] }); return { rows: [], rowCount: 1 };
    }
    if (/FROM coupon_redemptions cr JOIN coupons c/.test(normalized)) {
      const redemption = db.redemptions.find((r) => r.orderId === Number(values[0]) && r.status === 'redeemed');
      return { rows: redemption ? [{ ...redemption }] : [], rowCount: redemption ? 1 : 0 };
    }
    if (/UPDATE coupon_redemptions SET status='reversed'/.test(normalized)) {
      const redemption = db.redemptions.find((r) => r.id === Number(values[0]) && r.status === 'redeemed');
      if (redemption) redemption.status = 'reversed'; return { rows: [], rowCount: redemption ? 1 : 0 };
    }
    if (/FROM order_items WHERE order_id=\$1/.test(normalized)) return { rows: db.items.get(Number(values[0])) ?? [], rowCount: (db.items.get(Number(values[0])) ?? []).length };
    if (/SELECT variant_id FROM inventory WHERE variant_id=ANY/.test(normalized)) return { rows: values[0].filter((id) => db.variants.has(Number(id))).map((variant_id) => ({ variant_id })), rowCount: values[0].filter((id) => db.variants.has(Number(id))).length };
    if (/UPDATE inventory SET on_hand=on_hand\+/.test(normalized)) {
      const variant = db.variants.get(Number(values[0])); if (!variant) return { rows: [], rowCount: 0 };
      variant.onHand += values[1]; return { rows: [], rowCount: 1 };
    }
    if (/UPDATE orders SET status='cancelled'/.test(normalized)) { db.orders.get(Number(values[0])).status = 'cancelled'; return { rows: [], rowCount: 1 }; }
    throw new Error(`Unexpected order test SQL: ${normalized}`);
  };

  pool.connect = async () => {
    let release;
    let working;
    return {
      query: async (sql, values = []) => {
        const normalized = sql.trim();
        if (normalized === 'BEGIN') { release = await mutex.acquire(); working = structuredClone(state); return { rows: [], rowCount: 0 }; }
        if (normalized === 'COMMIT') { state = working; release(); release = null; return { rows: [], rowCount: 0 }; }
        if (normalized === 'ROLLBACK') { if (release) release(); release = null; return { rows: [], rowCount: 0 }; }
        return runQuery(working, sql, values);
      },
      release: () => {},
    };
  };
  pool.query = (sql, values = []) => runQuery(state, sql, values);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.connect = originalConnect; pool.query = originalQuery; await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = process.env.FRONTEND_ORIGIN;
  const admin = { Cookie: 'oje_admin_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', Origin: origin };
  const checkout = (email, variantId, quantity = 1, options = {}) => ({
    customer: { email, firstName: 'Test', lastName: 'Customer' }, cityId: options.cityId ?? 1,
    addressLine: 'Calle de prueba 123', items: [{ variantId, quantity }], ...(options.couponCode ? { couponCode: options.couponCode } : {}),
  });
  const createOrder = (email, variantId, options = {}, key = `idem-key-${Math.random().toString(36).slice(2, 12)}`, quantity = 1) => fetch(`${base}/api/ordenes`, {
    method: 'POST', headers: { Origin: process.env.FRONTEND_ORIGIN, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(checkout(email, variantId, quantity, options)),
  });

  const missingKey = await fetch(`${base}/api/ordenes`, { method: 'POST', headers: { Origin: process.env.FRONTEND_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(checkout('no-key@example.test', 11)) });
  assert.equal(missingKey.status, 400);

  const noCoupon = await createOrder('low@example.test', 11);
  assert.equal(noCoupon.status, 201);
  const noCouponBody = (await noCoupon.json()).data;
  assert.equal(noCouponBody.status, 'nueva');
  assert.equal(Number(noCouponBody.subtotal), 18500);
  assert.equal(Number(noCouponBody.shippingTotal), 1800);
  assert.equal(Number(noCouponBody.total), 20300);
  assert.equal(state.variants.get(11).onHand, 7);

  const freeShipping = await createOrder('high@example.test', 12);
  assert.equal(freeShipping.status, 201);
  assert.equal(Number((await freeShipping.json()).data.shippingTotal), 0);
  const withCoupon = await createOrder('coupon@example.test', 12, { couponCode: 'judo10' });
  assert.equal(withCoupon.status, 201);
  const withCouponBody = (await withCoupon.json()).data;
  assert.equal(Number(withCouponBody.discountTotal), 5000);
  assert.equal(Number(withCouponBody.shippingTotal), 0);
  assert.equal(withCouponBody.payments.length, 0);

  for (const [code, email] of [['EXPIRED', 'expired@example.test'], ['SOLDOUT', 'soldout@example.test'], ['USED', 'used@example.test']]) {
    const response = await createOrder(email, 11, { couponCode: code });
    assert.equal(response.status, 409);
  }
  const uncovered = await createOrder('uncovered@example.test', 11, { cityId: 2 });
  assert.equal(uncovered.status, 409);
  const insufficient = await createOrder('insufficient@example.test', 13, {}, 'stock-too-much-01', 2);
  assert.equal(insufficient.status, 409);

  const concurrentLastStock = await Promise.all([
    createOrder('stock-a@example.test', 13), createOrder('stock-b@example.test', 13),
  ]);
  assert.deepEqual(concurrentLastStock.map((response) => response.status).sort(), [201, 409]);
  assert.equal(state.variants.get(13).onHand, 0);

  const concurrentCoupon = await Promise.all([
    createOrder('limit-a@example.test', 11, { couponCode: 'ONEUSE' }),
    createOrder('limit-b@example.test', 11, { couponCode: 'ONEUSE' }),
  ]);
  assert.deepEqual(concurrentCoupon.map((response) => response.status).sort(), [201, 409]);

  const beforeRollbackOrders = state.orders.size;
  const beforeRollbackCustomers = state.customers.size;
  const beforeRollbackStock = state.variants.get(11).onHand;
  failOrderItems = true;
  const failed = await createOrder('rollback@example.test', 11);
  failOrderItems = false;
  assert.equal(failed.status, 500);
  assert.equal(state.orders.size, beforeRollbackOrders);
  assert.equal(state.customers.size, beforeRollbackCustomers);
  assert.equal(state.variants.get(11).onHand, beforeRollbackStock);

  const repeatKey = 'idempotent-repeat-key';
  const firstRepeat = await createOrder('repeat@example.test', 11, {}, repeatKey);
  const stockAfterRepeat = state.variants.get(11).onHand;
  const sameRepeat = await createOrder('repeat@example.test', 11, {}, repeatKey);
  assert.equal(firstRepeat.status, 201);
  assert.equal(sameRepeat.status, 201);
  assert.equal((await sameRepeat.json()).data.id, (await firstRepeat.json()).data.id);
  assert.equal(state.variants.get(11).onHand, stockAfterRepeat);
  const differentRepeat = await createOrder('repeat@example.test', 12, {}, repeatKey);
  assert.equal(differentRepeat.status, 409);

  const adminListDenied = await fetch(`${base}/api/ordenes`);
  assert.equal(adminListDenied.status, 401);
  const adminList = await fetch(`${base}/api/ordenes?estado=nueva&page=1&limit=20`, { headers: { Cookie: admin.Cookie } });
  assert.equal(adminList.status, 200);
  const orderId = noCouponBody.id;
  const detail = await fetch(`${base}/api/ordenes/${orderId}`, { headers: { Cookie: admin.Cookie } });
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).data.items.length, 1);
  const skip = await fetch(`${base}/api/ordenes/${orderId}/estado`, { method: 'PATCH', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'enviada' }) });
  assert.equal(skip.status, 409);
  const stateDenied = await fetch(`${base}/api/ordenes/${orderId}/estado`, { method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'pagada' }) });
  assert.equal(stateDenied.status, 401);
  const unpaid = await fetch(`${base}/api/ordenes/${orderId}/estado`, { method: 'PATCH', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'pagada' }) });
  assert.equal(unpaid.status, 409);

  const cancelOrder = await createOrder('cancel@example.test', 11, { couponCode: 'JUDO10' });
  assert.equal(cancelOrder.status, 201);
  const cancelId = (await cancelOrder.json()).data.id;
  const stockBeforeCancel = state.variants.get(11).onHand;
  const cancelled = await fetch(`${base}/api/ordenes/${cancelId}/cancelar`, { method: 'POST', headers: admin });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).data.status, 'cancelada');
  assert.equal(state.variants.get(11).onHand, stockBeforeCancel + 1);

  const expiredCouponOrder = await createOrder('expired-restore@example.test', 11, { couponCode: 'JUDO10' });
  const expiredCouponOrderId = (await expiredCouponOrder.json()).data.id;
  const consumedCoupon = state.redemptions.find((redemption) => redemption.orderId === expiredCouponOrderId);
  consumedCoupon.expiresAt = new Date(now - 1000);
  const expiredStock = state.variants.get(11).onHand;
  const expiredCancel = await fetch(`${base}/api/ordenes/${expiredCouponOrderId}/cancelar`, { method: 'POST', headers: admin });
  assert.equal(expiredCancel.status, 200);
  assert.equal(consumedCoupon.status, 'redeemed');
  assert.equal(state.variants.get(11).onHand, expiredStock + 1);
  const cancelAgain = await fetch(`${base}/api/ordenes/${cancelId}/cancelar`, { method: 'POST', headers: admin });
  assert.equal(cancelAgain.status, 409);
  assert.equal(state.variants.get(11).onHand, stockBeforeCancel + 1);

  const deniedPayment = await fetch(`${base}/api/ordenes/${orderId}/pago/confirmar`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(deniedPayment.status, 401);
  const paidOrderResponse = await createOrder('advance@example.test', 11);
  const paidOrder = (await paidOrderResponse.json()).data;
  const confirmedPayment = await fetch(`${base}/api/ordenes/${paidOrder.id}/pago/confirmar`, { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: 'TRANSFER-TEST-01' }) });
  assert.equal(confirmedPayment.status, 201);
  assert.equal((await confirmedPayment.json()).data.provider, 'manual');
  assert.equal(state.events.get(paidOrder.id).some((event) => event.from === event.to && event.note.includes('Pago externo')), true);
  assert.equal(state.audits.some((audit) => audit.action === 'payment.manual_confirmed' && audit.resourceId === String(paidOrder.id)), true);
  const duplicatePayment = await fetch(`${base}/api/ordenes/${paidOrder.id}/pago/confirmar`, { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(duplicatePayment.status, 409);
  const paid = await fetch(`${base}/api/ordenes/${paidOrder.id}/estado`, { method: 'PATCH', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'pagada' }) });
  assert.equal(paid.status, 200);
  const shipped = await fetch(`${base}/api/ordenes/${paidOrder.id}/estado`, { method: 'PATCH', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'enviada' }) });
  assert.equal(shipped.status, 200);
  const cancelShipped = await fetch(`${base}/api/ordenes/${paidOrder.id}/cancelar`, { method: 'POST', headers: admin });
  assert.equal(cancelShipped.status, 409);
  const delivered = await fetch(`${base}/api/ordenes/${paidOrder.id}/estado`, { method: 'PATCH', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'entregada' }) });
  assert.equal(delivered.status, 200);
});
