import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../../config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PG pool
const pool = new Pool({
  connectionString: config.db.url,
});

// Create adapter
const adapter = new PrismaPg(pool);

export const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: config.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });

if (config.env !== 'production') {
  globalForPrisma.prisma = prismaClient;
}
