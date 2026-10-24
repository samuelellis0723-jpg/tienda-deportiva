import { hashSessionToken } from '../services/authService.js';
import * as auth from '../models/authModel.js';
import { ApiError } from '../utils/errors.js';
import { SESSION_COOKIE_NAME } from '../config/security.js';

export function readSessionCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

export async function requireAdmin(req, _res, next) {
  try {
    const token = readSessionCookie(req);
    if (!token) throw new ApiError(401, 'Se requiere una sesión administrativa.');
    const session = await auth.findActiveAdminSession(hashSessionToken(token));
    if (!session) throw new ApiError(401, 'La sesión no es válida o venció.');
    req.adminUser = { id: session.id, email: session.email, role: 'admin' };
    req.sessionTokenHash = hashSessionToken(token);
    req.sessionExpiresAt = session.expiresAt;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalAdmin(req, _res, next) {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      req.isAdmin = false;
      return next();
    }
    const session = await auth.findActiveAdminSession(hashSessionToken(token));
    req.isAdmin = Boolean(session);
    if (session) {
      req.adminUser = { id: session.id, email: session.email, role: 'admin' };
      req.sessionTokenHash = hashSessionToken(token);
      req.sessionExpiresAt = session.expiresAt;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
