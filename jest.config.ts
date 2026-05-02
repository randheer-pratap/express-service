import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Where tests are located
  roots: ['<rootDir>/src'],

  // Match test files
  testMatch: ['**/**tests**/**/*.ts', '**/?(*.)+(spec|test).ts'],

  // TS transformation
  transform: {
    '^.+\.ts$': 'ts-jest',
  },

  // Ignore build + node_modules
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],

  // Clean mocks between tests
  clearMocks: true,

  // Coverage (optional but recommended)
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],

  // Path alias support (if you use tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
