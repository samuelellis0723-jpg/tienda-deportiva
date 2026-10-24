import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';

test('shipping coverage, coupon prevalidation and admin protection', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  const redeemedWrites = [];
  const now = Date.now();
  const couponFixtures = {
    VALID: { startsAt: new Date(now - 86400000), expiresAt: new Date(now + 86400000), usageLimit: 5, usageCount: 1, customerUsageCount: 0 },
    EXPIRED: { startsAt: new Date(now - 172800000), expiresAt: new Date(now - 86400000), usageLimit: 5, usageCount: 0, customerUsageCount: 0 },
    SOLDOUT: { startsAt: new Date(now - 86400000), expiresAt: new Date(now + 86400000), usageLimit: 2, usageCount: 2, customerUsageCount: 0 },
    USED: { startsAt: new Date(now - 86400000), expiresAt: new Date(now + 86400000), usageLimit: 5, usageCount: 1, customerUsageCount: 1 },
  };
  const originalQuery = pool.query.bind(pool);
  pool.query = async (sql, values = []) => {
    if (/FROM auth_sessions s/.test(sql)) return { rows: [{ id: 81, email: 'admin@example.test', expiresAt: new Date(Date.now() + 3600000) }], rowCount: 1 };
    if (/FROM cities WHERE id=\$1/.test(sql)) {
      const rows = {
        1: [{ id: 1, name: 'San José', province: 'San José', shippingCost: '1800.00', isActive: true }],
        2: [{ id: 2, name: 'Isla Remota', province: 'Puntarenas', shippingCost: '9000.00', isActive: false }],
      }[values[0]] ?? [];
      return { rows, rowCount: rows.length };
    }
    if (/FROM app_settings WHERE setting_key='free_shipping_threshold_crc'/.test(sql)) return { rows: [{ amount: '35000' }], rowCount: 1 };
    if (/FROM cities WHERE is_active=true/.test(sql)) return { rows: [{ id: 1, name: 'San José', province: 'San José', shippingCost: '1800.00', isActive: true }], rowCount: 1 };
    if (/INSERT INTO cities/.test(sql)) return { rows: [{ id: 3, name: values[0], province: values[1], shippingCost: values[2], isActive: values[3] }], rowCount: 1 };
    if (/FROM product_variants v JOIN products p/.test(sql)) return { rows: values[0].includes(11) ? [{ variantId: 11, unitPrice: '50000.00' }] : [], rowCount: 1 };
    if (/FROM coupons c LEFT JOIN coupon_redemptions/.test(sql)) {
      const fixture = couponFixtures[values[0]];
      if (!fixture) return { rows: [], rowCount: 0 };
      return { rows: [{ id: 7, code: values[0], discountType: 'percent', discountValue: '10.00', minimumSubtotal: '10000.00', perCustomerLimit: 1, isActive: true, ...fixture }], rowCount: 1 };
    }
    if (/FROM coupons ORDER BY/.test(sql)) return { rows: [{ id: 7, code: 'VALID' }], rowCount: 1 };
    if (/coupon_redemptions/.test(sql)) redeemedWrites.push(sql);
    throw new Error(`Unexpected SQL in shipping/coupon test: ${sql}`);
  };

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const bodyRequest = (path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  const admin = { Cookie: 'oje_admin_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', Origin: process.env.FRONTEND_ORIGIN };

  const publicCities = await fetch(`${base}/api/ciudades`);
  assert.equal(publicCities.status, 200);
  assert.deepEqual((await publicCities.json()).data.map((city) => city.id), [1]);

  const noSession = await fetch(`${base}/api/cupones`);
  assert.equal(noSession.status, 401);
  const adminCoupons = await fetch(`${base}/api/cupones`, { headers: { Cookie: admin.Cookie } });
  assert.equal(adminCoupons.status, 200);
  assert.deepEqual((await adminCoupons.json()).data, [{ id: 7, code: 'VALID' }]);

  const covered = await bodyRequest('/api/envios/cotizar', { cityId: 1, subtotal: 20000 });
  assert.equal(covered.status, 200);
  assert.equal((await covered.json()).data.shippingCost, 1800);
  const free = await bodyRequest('/api/envios/cotizar', { cityId: 1, subtotal: 35000 });
  assert.equal((await free.json()).data.shippingCost, 0);
  const uncovered = await bodyRequest('/api/envios/cotizar', { cityId: 2, subtotal: 50000 });
  assert.equal((await uncovered.json()).data.covered, false);
  const invalidShipping = await bodyRequest('/api/envios/cotizar', { cityId: 1, subtotal: '35000' });
  assert.equal(invalidShipping.status, 400);

  const valid = await bodyRequest('/api/cupones/validar', { code: 'valid', customerId: 25, items: [{ variantId: 11, quantity: 1 }] });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { data: { valid: true, code: 'VALID', subtotal: 50000, discount: 5000, message: 'Cupón válido. El descuento es una estimación y se recalculará al crear la orden.' } });
  for (const [code, expectedMessage] of [
    ['EXPIRED', 'El cupón venció.'],
    ['SOLDOUT', 'El cupón agotó sus usos disponibles.'],
    ['USED', 'Este cliente ya usó el cupón el máximo de veces permitido.'],
  ]) {
    const response = await bodyRequest('/api/cupones/validar', { code, customerId: 25, items: [{ variantId: 11, quantity: 1 }] });
    assert.equal(response.status, 200);
    const result = (await response.json()).data;
    assert.equal(result.valid, false);
    assert.equal(result.discount, 0);
    assert.equal(result.message, expectedMessage);
  }
  const invalidCouponRequest = await bodyRequest('/api/cupones/validar', { code: 'VALID', subtotal: 50000, items: [{ variantId: 11, quantity: 1 }] });
  assert.equal(invalidCouponRequest.status, 400);
  const unpublishedItem = await bodyRequest('/api/cupones/validar', { code: 'VALID', items: [{ variantId: 999, quantity: 1 }] });
  assert.equal(unpublishedItem.status, 400);
  assert.deepEqual(redeemedWrites, []);

  const createDenied = await bodyRequest('/api/ciudades', { name: 'Test', province: 'Test', shippingCost: 100 }, { Origin: process.env.FRONTEND_ORIGIN });
  assert.equal(createDenied.status, 401);
  const createAllowed = await bodyRequest('/api/ciudades', { name: 'Test', province: 'Test', shippingCost: 100 }, admin);
  assert.equal(createAllowed.status, 201);
});
