import { ApiError, mapDatabaseError } from '../utils/errors.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Recurso no encontrado.' });
}

export function errorHandler(error, _req, res, _next) {
  const mapped = mapDatabaseError(error);
  if (!(mapped instanceof ApiError)) {
    console.error('Error de API:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
  return res.status(mapped.status).json({ error: mapped.message });
}