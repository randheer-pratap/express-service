import Redis from 'ioredis';
import { config } from '../../config';

/**
 * Redis singleton using ioredis.
 *
 * ioredis over the official `redis` package because:
 * - Built-in reconnect strategy with exponential backoff
 * - Promise-based by default (no promisify wrappers)
 * - Better TypeScript support
 * - Cluster mode support when you need to scale
 */
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redisClient =
  globalForRedis.redis ??
  new Redis(config.redis.url, {
    // Retry up to 3 times with increasing delay
    // retryStrategy returning null stops retrying — don't
    // let Redis failures crash the app on startup
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    // Prevents ioredis from throwing on commands before connection
    enableOfflineQueue: false,
    lazyConnect: true,
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForRedis.redis = redisClient;
}
