import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { createApiRouter } from '../interfaces/http/routes.js';
import { errorHandler, notFoundHandler } from '../interfaces/http/error-handler.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, '../../public');

export function createApp(dependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_request, response, next) => {
    try {
      await dependencies.database.query('SELECT 1');
      response.json({ status: 'ok', service: 'umkm-gear' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', createApiRouter(dependencies));
  app.use(express.static(publicDirectory));

  app.use((request, response, next) => {
    if (request.method === 'GET' && !request.path.startsWith('/api/')) {
      return response.sendFile(path.join(publicDirectory, 'index.html'));
    }
    return next();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
