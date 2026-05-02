import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';

export function createApp(): Application {
  const app = express();

  // Security headers first — always
  app.use(helmet());

  // CORS
  app.use(cors({ origin: config.cors.origin, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: '10kb' })); // Limit body size — DoS protection
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Health check — no auth required, no business logic
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes will be registered here in Phase 3+
  // app.use('/api/v1', router);

  return app;
}
