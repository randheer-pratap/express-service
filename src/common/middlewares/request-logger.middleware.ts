import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { asyncLocalStorage } from '../../infrastructure/logger/winston.logger';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';
import { ILogger } from '../../common/interfaces/logger.interface';

/**
 * RequestLoggerMiddleware does three things:
 *
 * 1. Generates a requestId (UUID v4) and attaches it to req, res header,
 *    and the AsyncLocalStorage context. Every log line for this request
 *    will automatically include this ID — no manual passing needed.
 *
 * 2. Logs the incoming request with method, path, and IP.
 *
 * 3. Hooks into res.on('finish') to log the outgoing response with
 *    status code and duration. This is non-blocking — the response
 *    is already sent when this fires.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Attach to request so controllers can access it
  req.requestId = requestId;

  // Send back to client
  res.setHeader('X-Request-Id', requestId);

  // Run the rest of the request lifecycle inside the async context
  asyncLocalStorage.run({ requestId }, () => {
    const logger = container.resolve<ILogger>(TOKENS.Logger);

    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger[level]('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    });

    next();
  });
}
