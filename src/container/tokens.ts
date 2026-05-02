import { HealthService } from '../modules/health/health.service';

/**
 * Tokens are the unique keys used to register and resolve dependencies
 * from the IoC container. Using Symbol prevents accidental string key
 * collisions across large codebases.
 *
 * Convention: one token per injectable interface.
 */
export const TOKENS = {
  // Infrastructure
  Logger: Symbol('Logger'),
  PrismaClient: Symbol('PrismaClient'),
  RedisClient: Symbol('RedisClient'),

  // Repositories
  UserRepository: Symbol('UserRepository'),

  // Services
  UserService: Symbol('UserService'),
  AuthService: Symbol('AuthService'),
  HealthService: Symbol('HealthService'),

  // Config
  Config: Symbol('Config'),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
