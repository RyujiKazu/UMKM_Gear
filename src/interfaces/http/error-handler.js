import { AppError } from '../../domain/errors.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${request.method} ${request.path} tidak ditemukan.` },
  });
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === '23505') {
    return response.status(409).json({
      error: { code: 'DUPLICATE_DATA', message: 'Email, kode unit, atau nama kategori sudah digunakan.' },
    });
  }

  if (error.code === '23503') {
    return response.status(409).json({
      error: { code: 'RELATED_DATA', message: 'Data masih digunakan oleh data lain.' },
    });
  }

  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) console.error(error);

  const payload = {
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error instanceof AppError || statusCode < 500
        ? error.message
        : 'Terjadi kesalahan pada server.',
    },
  };
  if (error.details) payload.error.details = error.details;

  return response.status(statusCode).json(payload);
}
