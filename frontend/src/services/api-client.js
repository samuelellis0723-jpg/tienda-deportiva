const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method, signal, cache: 'no-store', credentials: 'include', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('No se pudo conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) globalThis.dispatchEvent?.(new Event('oje:session-expired'));
    throw new ApiError(payload?.error || 'No se pudo completar la solicitud.', response.status);
  }
  return payload;
}
