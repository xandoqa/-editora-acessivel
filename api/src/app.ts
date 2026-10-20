import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { pool } from './db/client';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { apiLimiter } from './middlewares/rate-limit';
import routes from './routes';
import { ensureUploadDirs } from './services/storage.service';
import { logger } from './utils/logger';

/** Monta a aplicação Express (sem abrir porta) — reutilizada pelo servidor e pelos testes. */
export function createApp(): Express {
  ensureUploadDirs();
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(
    helmet({
      // Capas são exibidas pelo front-end, que pode estar em outra origem (dev): permitir cross-origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        // Requisições sem Origin (curl, mesma origem via proxy) são permitidas.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  if (env.LOG_REQUESTS && !env.isTest) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`));
      next();
    });
  }

  /** Healthcheck usado pelo Docker: verifica também a conexão com o PostgreSQL. */
  app.get(['/health', '/api/health'], async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });

  // Somente as capas são públicas e estáticas. Arquivos das obras e áudios passam por rotas com checagem de permissão.
  app.use(
    '/uploads/covers',
    express.static(path.join(env.uploadDir, 'covers'), { fallthrough: false, maxAge: '7d', index: false }),
  );

  app.use('/api', apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
