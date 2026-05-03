import dotenv from 'dotenv';
import path from 'path';

// Load the right .env file based on NODE_ENV
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env['NODE_ENV'] ?? 'development'}`),
});

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  env: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3000'), 10),

  db: {
    url: requireEnv('DATABASE_URL'),
  },

  redis: {
    url: requireEnv('REDIS_URL'),
  },

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  cors: {
    origin: optionalEnv('CORS_ORIGIN', 'http://localhost:3001'),
  },
} as const;

export type Config = typeof config;
