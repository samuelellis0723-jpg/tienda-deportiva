import { ApiError } from '../utils/errors.js';

export const SESSION_COOKIE_NAME = 'oje_admin_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function frontendOrigin() {
  const configured = process.env.FRONTEND_ORIGIN ?? (process.env.NODE_ENV === 'production' ? null : 'http://localhost:5173');
  if (!configured || configured === '*') return null;
  try {
    const parsed = new URL(configured);
    if (parsed.origin !== configured || !['http:', 'https:'].includes(parsed.protocol)) return null;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return null;
    return configured;
  } catch {
    return null;
  }
}

export function cookieOptions() {
  const sameSite = (process.env.SESSION_COOKIE_SAME_SITE ?? 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) throw new ApiError(503, 'SESSION_COOKIE_SAME_SITE debe ser lax, strict o none.');
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
  return { httpOnly: true, secure, sameSite, path: '/api', maxAge: SESSION_TTL_MS };
}

export function clearCookieOptions() {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  return options;
}

export function requireSameOrigin(req, _res, next) {
  const allowed = frontendOrigin();
  if (!allowed) return next(new ApiError(503, 'Configura FRONTEND_ORIGIN para habilitar el acceso administrativo.'));
  if (req.get('origin') !== allowed) return next(new ApiError(403, 'El origen de la solicitud no está permitido.'));
  return next();
}
