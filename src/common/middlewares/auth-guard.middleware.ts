import { Request, Response, NextFunction } from 'express';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';
import { ITokenService } from '../../common/interfaces/token.interface';
import { UnauthorizedError } from '../../common/errors/http-errors';

/**
 * authGuard: protects routes that require authentication.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies the signature + expiry, and attaches the decoded
 * payload to req.user for downstream controllers.
 *
 * This is STATELESS — no Redis hit. Access tokens are verified
 * by signature alone. This is what makes the system fast.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7);
  try {
    const tokenService = container.resolve<ITokenService>(TOKENS.TokenService);
    const payload = tokenService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err); // UnauthorizedError flows to globalErrorHandler
  }
}
