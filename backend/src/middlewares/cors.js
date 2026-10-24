import { frontendOrigin } from '../config/security.js';

export function credentialCors(req, res, next) {
  const origin = req.get('origin');
  const allowed = frontendOrigin();
  if (origin && origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.vary('Origin');
  }
  if (req.method === 'OPTIONS') {
    if (origin && origin !== allowed) return res.status(403).json({ error: 'El origen de la solicitud no está permitido.' });
    return res.sendStatus(204);
  }
  return next();
}
