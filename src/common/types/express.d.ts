import { AccessTokenPayload } from '@/common/interfaces/token.interface';
// Module augmentation — extends Express's built-in Request type.
// This is the correct TypeScript pattern for adding properties to
// third-party types without editing node_modules.
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AccessTokenPayload;
    }
  }
}

export {};
