import { container } from './container';
import { TOKENS } from './tokens';

// Infrastructure
import { WinstonLogger } from '../infrastructure/logger/winston.logger';
import { prismaClient } from '../infrastructure/database/prisma.client';

// Repositories
import { UserRepository } from '../modules/user/user.repository';

// Services
import { UserService } from '../modules/user/user.service';

/**
 * COMPOSITION ROOT
 *
 * This is the single place where the entire dependency graph is
 * wired together. It is the only file in the codebase that imports
 * concrete classes (not interfaces).
 *
 * The order of bindings does NOT matter because we use lazy factories.
 * Resolution happens at runtime, not at registration time.
 */

// --- Infrastructure ---
// prismaClient is already a singleton (constructed before this runs),
// so we use bindValue to hand it directly to the container.
container.bindValue(TOKENS.PrismaClient, prismaClient);

// Logger: singleton — one logger for the whole app lifetime.
container.bind(TOKENS.Logger, () => new WinstonLogger());

// --- Repositories ---
// The factory receives the container (`c`) and resolves its own
// dependencies from it. This is the recursive resolution pattern.
container.bind(
  TOKENS.UserRepository,
  (c) =>
    new UserRepository(
      c.resolve(TOKENS.PrismaClient), // resolves PrismaClient singleton
      c.resolve(TOKENS.Logger), // resolves Logger singleton
    ),
);

// --- Services ---
container.bind(
  TOKENS.UserService,
  (c) =>
    new UserService(
      c.resolve(TOKENS.UserRepository), // resolves UserRepository
      c.resolve(TOKENS.Logger),
    ),
);

export { container };
