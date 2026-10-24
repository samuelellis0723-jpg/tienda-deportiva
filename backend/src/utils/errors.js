export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function mapDatabaseError(error) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599) return new ApiError(error.status, error.message);
  if (error?.code === '23505') return new ApiError(409, 'Ya existe un recurso con esos datos únicos.');
  if (error?.code === '23503') return new ApiError(409, 'No se puede completar la operación porque el recurso tiene relaciones activas.');
  if (error?.code === '23514' || error?.code === '22P02' || error?.code === '22003') {
    return new ApiError(400, 'Los datos no cumplen las restricciones del recurso.');
  }
  return error;
}