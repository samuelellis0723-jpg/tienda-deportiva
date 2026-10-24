import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';

test('admin summary and replenishment alerts aggregate paid sales and seven-day stock coverage', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  const originalQuery = pool.query.bind(pool);
  const sqlSeen = [];
  pool.query = async (sql) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    sqlSeen.push(normalized);
    if (normalized.includes('FROM auth_sessions s')) return { rows: [{ id: 81, email: 'admin@example.test', expiresAt: new Date(Date.now() + 3600000) }], rowCount: 1 };
    if (normalized.includes('FROM categories c')) return { rows: [{ id: 1, name: 'Judo', sales: '37000.00', units: 2 }, { id: 2, name: 'BJJ', sales: '0.00', units: 0 }], rowCount: 2 };
    if (normalized.includes('FROM products p JOIN product_variants')) return { rows: [{ id: 10, name: 'Gi', units_sold: 2, sales: '37000.00' }], rowCount: 1 };
    if (normalized.includes('average_order_value')) return { rows: [{ average_order_value: '18500.00' }], rowCount: 1 };
    if (normalized.includes('SELECT status,COUNT(*)')) return { rows: [{ status: 'cancelled', count: 1 }, { status: 'paid', count: 2 }, { status: 'pending_payment', count: 1 }], rowCount: 3 };
    if (normalized.includes("COUNT(*) FILTER (WHERE status='publicado')")) return { rows: [{ published: 4, draft: 2 }], rowCount: 1 };
    if (normalized.includes('WITH sales_7_days AS')) return { rows: [
      { variantId: 30, sku: 'ZERO', productName: 'Cinturón', availableStock: 0, unitsSoldLast7Days: 0, averageDailySales: '0.00', daysOfStockRemaining: null },
      { variantId: 31, sku: 'LOW', productName: 'Gi', availableStock: 1, unitsSoldLast7Days: 3, averageDailySales: '0.43', daysOfStockRemaining: '2.33' },
    ], rowCount: 2 };
    throw new Error(`Unexpected metrics test SQL: ${normalized}`);
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const unauthenticated = await fetch(`${base}/api/resumen`);
  assert.equal(unauthenticated.status, 401);
  const headers = { Cookie: 'oje_admin_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
  const summaryResponse = await fetch(`${base}/api/resumen`, { headers });
  assert.equal(summaryResponse.status, 200);
  const summary = (await summaryResponse.json()).data;
  assert.equal(summary.salesByCategory[0].sales, '37000.00');
  assert.equal(summary.topProducts.length, 1);
  assert.equal(summary.averageOrderValue, '18500.00');
  assert.equal(summary.orderCounts.find((item) => item.status === 'cancelled').count, 1);
  assert.deepEqual(summary.productCounts, { published: 4, draft: 2 });
  const alertsResponse = await fetch(`${base}/api/alertas-reposicion`, { headers });
  assert.equal(alertsResponse.status, 200);
  const alerts = await alertsResponse.json();
  assert.equal(alerts.data[0].availableStock, 0);
  assert.equal(alerts.data[0].daysOfStockRemaining, null);
  assert.equal(alerts.meta.periodDays, 7);
  const salesSql = sqlSeen.filter((sql) => sql.includes('SUM(oi.quantity)') || sql.includes('AVG(total)'));
  for (const sql of salesSql) assert.match(sql, /'paid','processing','shipped','delivered'/);
  const alertSql = sqlSeen.find((sql) => sql.includes('WITH sales_7_days AS'));
  assert.match(alertSql, /now\(\) - interval '7 days'/);
  assert.match(alertSql, /NULLIF\(/);
});
