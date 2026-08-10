import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { USER_ROLES } from '../../domain/constants.js';
import { asyncHandler, createAuthenticationMiddleware, requireRole, TOKEN_COOKIE, validate } from './middleware.js';
import {
  borrowSchema,
  categorySchema,
  idParamsSchema,
  loginSchema,
  memberCreateSchema,
  memberUpdateSchema,
  profileSchema,
  returnSchema,
  unitSchema,
} from './schemas.js';

export function createApiRouter({ services, tokenService, authConfig }) {
  const router = Router();
  const authenticate = createAuthenticationMiddleware({ tokenService, authService: services.auth });
  const adminOnly = requireRole(USER_ROLES.ADMIN);
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Terlalu banyak percobaan login. Coba lagi nanti.' } },
  });

  router.post('/auth/login', loginLimiter, validate(loginSchema), asyncHandler(async (request, response) => {
    const user = await services.auth.login(request.body);
    const token = tokenService.sign(user);
    response.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: authConfig.secureCookie,
      maxAge: 8 * 60 * 60 * 1000,
    });
    response.json({ data: user });
  }));

  router.post('/auth/logout', (_request, response) => {
    response.clearCookie(TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      secure: authConfig.secureCookie,
    });
    response.status(204).end();
  });

  router.get('/auth/me', authenticate, (request, response) => response.json({ data: request.user }));

  router.get('/units', authenticate, asyncHandler(async (request, response) => {
    const units = await services.catalog.listUnits({
      query: String(request.query.q ?? ''),
      onlyAvailable: request.query.available === 'true',
    });
    response.json({ data: units });
  }));

  router.get('/categories', authenticate, asyncHandler(async (_request, response) => {
    response.json({ data: await services.catalog.listCategories() });
  }));

  router.get('/profile', authenticate, asyncHandler(async (request, response) => {
    response.json({ data: await services.profile.getProfile(request.user) });
  }));

  router.put('/profile', authenticate, validate(profileSchema), asyncHandler(async (request, response) => {
    response.json({ data: await services.profile.updateProfile(request.user, request.body) });
  }));

  router.get('/loans/mine', authenticate, asyncHandler(async (request, response) => {
    response.json({ data: await services.loan.listMine(request.user) });
  }));

  router.post('/loans', authenticate, validate(borrowSchema), asyncHandler(async (request, response) => {
    response.status(201).json({ data: await services.loan.borrow(request.user, request.body) });
  }));

  router.use('/admin', authenticate, adminOnly);

  router.get('/admin/dashboard', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.dashboard(request.user) });
  }));
  router.get('/admin/loans/active', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.listActiveLoans(request.user) });
  }));
  router.get('/admin/loans/history', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.listHistory(request.user) });
  }));
  router.post(
    '/admin/loan-items/:id/return',
    validate(idParamsSchema, 'params'),
    validate(returnSchema),
    asyncHandler(async (request, response) => {
      response.json({ data: await services.admin.returnItem(request.user, request.params.id, request.body) });
    }),
  );

  router.get('/admin/units', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.listUnits(request.user, String(request.query.q ?? '')) });
  }));
  router.post('/admin/units', validate(unitSchema), asyncHandler(async (request, response) => {
    response.status(201).json({ data: await services.admin.createUnit(request.user, request.body) });
  }));
  router.put(
    '/admin/units/:id',
    validate(idParamsSchema, 'params'),
    validate(unitSchema),
    asyncHandler(async (request, response) => {
      response.json({ data: await services.admin.updateUnit(request.user, request.params.id, request.body) });
    }),
  );
  router.delete('/admin/units/:id', validate(idParamsSchema, 'params'), asyncHandler(async (request, response) => {
    await services.admin.deleteUnit(request.user, request.params.id);
    response.status(204).end();
  }));

  router.get('/admin/categories', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.listCategories(request.user) });
  }));
  router.post('/admin/categories', validate(categorySchema), asyncHandler(async (request, response) => {
    response.status(201).json({ data: await services.admin.createCategory(request.user, request.body) });
  }));
  router.put(
    '/admin/categories/:id',
    validate(idParamsSchema, 'params'),
    validate(categorySchema),
    asyncHandler(async (request, response) => {
      response.json({ data: await services.admin.updateCategory(request.user, request.params.id, request.body) });
    }),
  );
  router.delete('/admin/categories/:id', validate(idParamsSchema, 'params'), asyncHandler(async (request, response) => {
    await services.admin.deleteCategory(request.user, request.params.id);
    response.status(204).end();
  }));

  router.get('/admin/members', asyncHandler(async (request, response) => {
    response.json({ data: await services.admin.listMembers(request.user) });
  }));
  router.post('/admin/members', validate(memberCreateSchema), asyncHandler(async (request, response) => {
    response.status(201).json({ data: await services.admin.createMember(request.user, request.body) });
  }));
  router.put(
    '/admin/members/:id',
    validate(idParamsSchema, 'params'),
    validate(memberUpdateSchema),
    asyncHandler(async (request, response) => {
      response.json({ data: await services.admin.updateMember(request.user, request.params.id, request.body) });
    }),
  );
  router.delete('/admin/members/:id', validate(idParamsSchema, 'params'), asyncHandler(async (request, response) => {
    await services.admin.deleteMember(request.user, request.params.id);
    response.status(204).end();
  }));

  return router;
}
