import * as service from '../services/authService.js';
import { clearCookieOptions, cookieOptions, SESSION_COOKIE_NAME } from '../config/security.js';
import { readSessionCookie } from '../middlewares/auth.js';
import { hashSessionToken } from '../services/authService.js';

export async function login(req, res) {
  const result = await service.login(req.body);
  res.cookie(SESSION_COOKIE_NAME, result.token, cookieOptions());
  res.status(200).json({ data: { user: result.user, expiresAt: result.expiresAt } });
}

export async function logout(req, res) {
  const token = readSessionCookie(req);
  await service.logout(token ? hashSessionToken(token) : null);
  res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions());
  res.status(200).json({ data: { loggedOut: true } });
}

export function me(req, res) {
  res.status(200).json({ data: { user: req.adminUser, expiresAt: req.sessionExpiresAt } });
}
