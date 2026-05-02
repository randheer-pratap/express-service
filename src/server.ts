import { createApp } from './app';
import { config } from './config';
import { prismaClient } from './infrastructure/database/prisma.client';
import { container } from './container';
import { TOKENS } from './container/tokens';
import { ILogger } from './common/interfaces/logger.interface';

async function bootstrap(): Promise<void> {
  // Verify DB connection before accepting traffic
  await prismaClient.$connect();
  console.log('✓ Database connected');

  const logger = container.resolve<ILogger>(TOKENS.Logger);
  logger.info('Container resolved successfully', {
    bindings: ['Logger', 'PrismaClient', 'UserRepository', 'UserService'],
  });

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`✓ Server running on port ${config.port} [${config.env}]`);
  });

  // Graceful shutdown — critical for production
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prismaClient.$disconnect();
      console.log('✓ Database disconnected');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
