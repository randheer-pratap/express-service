import { PrismaClient } from '@prisma/client';
import { ILogger } from '../../common/interfaces/logger.interface';
import { Redis } from 'ioredis';

type ServiceHealth = {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
};

type HealthReport = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
};

/**
 * HealthService checks all infrastructure dependencies and returns
 * a structured report. This is what your load balancer, Kubernetes
 * liveness probe, and uptime monitors hit.
 *
 * Rule: this endpoint must NEVER return 200 if the app can't serve
 * real traffic. A degraded state (one service down) returns 503.
 */
export class HealthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: Redis,
    private readonly logger: ILogger,
  ) {}

  async getHealth(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const allHealthy = database.status === 'healthy' && redis.status === 'healthy';
    const allUnhealthy = database.status === 'unhealthy' && redis.status === 'unhealthy';

    const status = allHealthy ? 'healthy' : allUnhealthy ? 'unhealthy' : 'degraded';

    const report: HealthReport = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: { database, redis },
    };

    if (status !== 'healthy') {
      this.logger.warn('Health check degraded', { report });
    }

    return report;
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // $queryRaw with a simple SELECT 1 is the lightest possible DB ping
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') throw new Error('Unexpected ping response');
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Redis error',
      };
    }
  }
}
