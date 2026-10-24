import { createHash, randomBytes } from 'node:crypto';
import * as auth from '../models/authModel.js';
import { ApiError } from '../utils/errors.js';
import { SESSION_TTL_MS } from '../config/security.js';
import { verifyPassword } from './passwordService.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCredentials(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'El cuerpo debe ser un objeto JSON.');
  if (Object.keys(input).some((key) => !['email', 'password'].includes(key))) throw new ApiError(400, 'La solicitud contiene campos no permitidos.');
  if (typeof input.email !== 'string' || input.email.trim().length > 254 || !emailPattern.test(input.email.trim())) {
    throw new ApiError(400, 'Email o contraseña no válidos.');
  }
  if (typeof input.password !== 'string' || input.password.length === 0 || Buffer.byteLength(input.password, 'utf8') > 128) {
    throw new ApiError(400, 'Email o contraseña no válidos.');
  }
  return { email: input.email.trim().toLowerCase(), password: input.password };
}

export async function login(input) {
  const credentials = parseCredentials(input);
  const user = await auth.findUserForLogin(credentials.email);
  const matches = await verifyPassword(credentials.password, user?.passwordHash);
  if (!user || !user.isActive || !user.roles.includes('admin') || !matches) {
    throw new ApiError(401, 'Credenciales no válidas.');
  }
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await auth.createSession(user.id, tokenHash, expiresAt);
  return { token, expiresAt, user: { id: user.id, email: user.email, role: 'admin' } };
}

export async function currentSession(tokenHash) {
  const user = await auth.findActiveAdminSession(tokenHash);
  if (!user) throw new ApiError(401, 'La sesión no es válida o venció.');
  return { user: { id: user.id, email: user.email, role: 'admin' }, expiresAt: user.expiresAt };
}

export async function logout(tokenHash) {
  if (tokenHash) await auth.revokeSession(tokenHash);
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
