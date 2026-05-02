import winston from 'winston';
import { ILogger } from '../../common/interfaces/logger.interface';
import { config } from '../../config';

/**
 * WinstonLogger is the concrete implementation of ILogger.
 * Services that need logging depend on ILogger (the interface),
 * not WinstonLogger (this class). That's the dependency inversion.
 *
 * Tomorrow if you want to switch to Pino, you implement ILogger
 * with PinoLogger and update one line in the container. Zero
 * changes to any service.
 */
export class WinstonLogger implements ILogger {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.env === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        config.env === 'production'
          ? winston.format.json() // machine-readable in prod
          : winston.format.prettyPrint(), // human-readable in dev
      ),
      transports: [new winston.transports.Console()],
      // Prevent winston from throwing on unhandled errors
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
