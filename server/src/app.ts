import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import type { Dependencies } from './deps.js';
import { registerEventHandlers } from './events/handlers.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { createAdminRouter } from './modules/admin/controller.js';
import { createAuthRouter } from './modules/auth/controller.js';
import { createNotificationsRouter } from './modules/notifications/controller.js';
import { createTicketsRouter } from './modules/tickets/controller.js';

const wiredBuses = new WeakSet<object>();

export function createApp(deps: Dependencies) {
  if (!wiredBuses.has(deps.eventBus)) {
    registerEventHandlers(deps);
    wiredBuses.add(deps.eventBus);
  }

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/', (_req, res) => {
    res.json({
      name: 'Support Ticket Management System API',
      version: '1.0.0',
      docs: '/docs/api.md in the repository',
      health: '/health',
      basePath: '/api',
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'stms-api', time: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(deps));
  app.use('/api/tickets', createTicketsRouter(deps));
  app.use('/api/admin', createAdminRouter(deps));
  app.use('/api/notifications', createNotificationsRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
