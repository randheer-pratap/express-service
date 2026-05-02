import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';

// Importing the container triggers the composition root registration.
// This must happen before any routes or middleware that use resolved deps.
import './container';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
