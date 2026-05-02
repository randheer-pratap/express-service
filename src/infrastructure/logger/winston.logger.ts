import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { ILogger } from '../../common/interfaces/logger.interface';
import { config } from '../../config';

/**
 * AsyncLocalStorage holds a context object for the duration of a
 * single async call chain (i.e., one HTTP request). Any code that
 * runs within that chain — middleware, service, repository — can
 * read the requestId without it being passed as a parameter.
 *
 * This is exported so the request middleware can set it, and the
 * logger can read it automatically on every log call.
 */
export const asyncLocalStorage = new AsyncLocalStorage<{ requestId: string }>();

export class WinstonLogger implements ILogger {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.env === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        // Custom format that injects the requestId from async context
        winston.format((info) => {
          const store = asyncLocalStorage.getStore();
          if (store?.requestId) {
            info['requestId'] = store.requestId;
          }
          return info;
        })(),
        config.env === 'production' ? winston.format.json() : winston.format.prettyPrint(),
      ),
      transports: [new winston.transports.Console()],
      exitOnError: false,
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }
}
