import { AuthorizationError, AuthenticationError } from '../../domain/errors.js';

export const TOKEN_COOKIE = 'umkm_gear_token';

export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function validate(schema, target = 'body') {
  return (request, _response, next) => {
    const result = schema.safeParse(request[target]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(Object.assign(new Error('Data yang dikirim belum valid.'), {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        details,
      }));
    }
    request[target] = result.data;
    return next();
  };
}

export function createAuthenticationMiddleware({ tokenService, authService }) {
  return asyncHandler(async (request, _response, next) => {
    const token = request.cookies[TOKEN_COOKIE];
    if (!token) throw new AuthenticationError('Silakan login terlebih dahulu.');

    try {
      const payload = tokenService.verify(token);
      request.user = await authService.getUser(Number(payload.sub));
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('Sesi sudah berakhir. Silakan login kembali.');
    }
  });
}

export function requireRole(role) {
  return (request, _response, next) => {
    if (request.user?.role !== role) return next(new AuthorizationError());
    return next();
  };
}
