import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors/app-error';
import { errorResponse } from '../../common/types/api.response';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';
import { ILogger } from '../../common/interfaces/logger.interface';

/**
 * Global error handler — the last middleware registered in app.ts.
 * All errors thrown anywhere in the application land here.
 *
 * The separation logic:
 * - AppError (isOperational: true)  → expected failure, log as warn
 * - AppError (isOperational: false) → programmer mistake, log as error
 * - Unknown error                   → something completely unexpected,
 *                                     log as error, hide details from client
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const logger = container.resolve<ILogger>(TOKENS.Logger);
  const requestId = req.requestId;

  if (err instanceof AppError) {
    // Log operational errors as warnings — they're expected
    const logLevel = err.isOperational ? 'warn' : 'error';
    logger[logLevel](err.message, {
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      requestId,
    });

    res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details, requestId));
    return;
  }

  // Unknown error — don't leak internal details to the client
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled error', {
    message,
    stack: err instanceof Error ? err.stack : undefined,
    requestId,
  });

  res
    .status(500)
    .json(
      errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', undefined, requestId),
    );
}
