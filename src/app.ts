import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import './container';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { registerOAuthStrategies } from './infrastructure/auth/strategies';

// Middlewares
import { requestLoggerMiddleware } from './common/middlewares/request-logger.middleware';
import { globalErrorHandler } from './common/middlewares/error-handler.middleware';
import { notFoundHandler } from './common/middlewares/not-found.middleware';

// Routes
import { createHealthRouter } from './modules/health/health.routes';
import { createAuthRouter } from './modules/auth/auth.routes';

export function createApp(): Application {
  const app = express();

  // --- Security (always first) ---
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: true }));

  // --- Request parsing ---
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.use(cookieParser());

  // Register OAuth strategies before routes
  // session: false — we use JWTs, not Passport sessions
  app.use(passport.initialize());
  registerOAuthStrategies();

  // --- Observability (before routes so every request is logged) ---
  app.use(requestLoggerMiddleware);

  // --- Routes ---
  app.use('/health', createHealthRouter());

  app.use('/api/v1/auth', createAuthRouter());

  // --- Catch-all for unmatched routes (must be after all routes) ---
  app.use(notFoundHandler);

  // --- Global error handler (must be absolutely last, 4-arg signature) ---
  app.use(globalErrorHandler);

  return app;
}
