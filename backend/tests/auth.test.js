import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/database.js';
import { hashPassword } from '../src/services/passwordService.js';
import { SESSION_COOKIE_NAME } from '../src/config/security.js';

test('administrative authentication lifecycle and protected API', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  process.env.SESSION_COOKIE_SAME_SITE = 'lax';
  const email = `admin-${randomBytes(6).toString('hex')}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const passwordHash = await hashPassword(password);
  const sessions = new Map();
  let failDb = false;
  const originalQuery = pool.query.bind(pool);
  pool.query = async (sql, values = []) => {
    if (failDb) throw new Error('private database details');
    if (sql.includes('FROM users u') && sql.includes('WHERE u.email=$1')) {
      return { rows: [{ id: 81, email, passwordHash, isActive: true, roles: ['admin'] }], rowCount: 1 };
    }
    if (sql.includes('DELETE FROM auth_sessions')) return { rows: [], rowCount: 0 };
    if (sql.includes('INSERT INTO auth_sessions')) {
      sessions.set(values[0], { userId: values[1], expiresAt: values[2], revoked: false });
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('FROM auth_sessions s')) {
      const session = sessions.get(values[0]);
      return { rows: session && !session.revoked && session.expiresAt > new Date()
        ? [{ id: session.userId, email, expiresAt: session.expiresAt }] : [], rowCount: 1 };
    }
    if (sql.includes('UPDATE auth_sessions SET revoked_at=now()')) {
      const session = sessions.get(values[0]);
      if (session) session.revoked = true;
      return { rows: [], rowCount: session ? 1 : 0 };
    }
    if (sql.includes('SELECT count(*)::int AS total FROM products p')) return { rows: [{ total: 0 }], rowCount: 1 };
    if (sql.includes('FROM products p')) return { rows: [], rowCount: 0 };
    throw new Error(`Unexpected SQL in auth test: ${sql}`);
  };

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    await closePool();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = { Origin: process.env.FRONTEND_ORIGIN };

  const invalid = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { ...origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: `${password}wrong` }),
  });
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), { error: 'Credenciales no válidas.' });
  assert.equal(invalid.headers.get('set-cookie'), null);

  const malformed = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { ...origin, 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'El cuerpo JSON no es válido.' });

  const blocked = await fetch(`${base}/api/productos?estado=borrador`);
  assert.equal(blocked.status, 401);
  assert.deepEqual(await blocked.json(), { error: 'Se requiere una sesión administrativa.' });

  const badOrigin = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(badOrigin.status, 403);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { ...origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('access-control-allow-origin'), process.env.FRONTEND_ORIGIN);
  assert.equal(login.headers.get('access-control-allow-credentials'), 'true');
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=[A-Za-z0-9_-]{43};`));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\/api/i);
  const cookiePair = cookie.split(';', 1)[0];
  const loginBody = await login.json();
  assert.deepEqual(loginBody.data.user, { id: 81, email, role: 'admin' });
  assert.equal(JSON.stringify(loginBody).includes(passwordHash), false);
  const rawSession = cookiePair.slice(cookiePair.indexOf('=') + 1);
  assert.equal(sessions.size, 1);
  assert.equal(sessions.has(rawSession), false);

  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookiePair } });
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).data.user, { id: 81, email, role: 'admin' });

  const protectedRead = await fetch(`${base}/api/productos?estado=borrador`, { headers: { Cookie: cookiePair } });
  assert.equal(protectedRead.status, 200);

  failDb = true;
  const internalError = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookiePair } });
  assert.equal(internalError.status, 500);
  const errorBody = await internalError.json();
  assert.deepEqual(errorBody, { error: 'Ocurrió un error interno.' });
  assert.equal(JSON.stringify(errorBody).includes('private database details'), false);
  failDb = false;

  const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { ...origin, Cookie: cookiePair } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
  assert.equal(sessions.get([...sessions.keys()][0]).revoked, true);
  const afterLogout = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookiePair } });
  assert.equal(afterLogout.status, 401);
  const protectedAfterLogout = await fetch(`${base}/api/productos?estado=borrador`, { headers: { Cookie: cookiePair } });
  assert.equal(protectedAfterLogout.status, 401);
});
