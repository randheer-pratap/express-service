import { Request, Response, NextFunction } from 'express';
import { IAuthService, RegisterDTO } from '../../common/interfaces/auth.interface';
import { successResponse } from '../../common/types/api.response';
import { ValidationError } from '../../common/errors/http-errors';

const REFRESH_COOKIE = 'refreshToken';

/**
 * Cookie configuration — httpOnly is the critical flag.
 *
 * httpOnly: true  → JavaScript cannot read this cookie.
 *                   XSS attacks cannot steal the refresh token.
 * secure: true    → Cookie only sent over HTTPS (set in production).
 * sameSite: strict → Cookie not sent on cross-site requests.
 *                   Protects against CSRF.
 * path: /auth/refresh → Cookie only sent to this specific endpoint.
 *                       Minimises attack surface.
 */
function getRefreshCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body as Record<
        string,
        string | undefined
      >;

      if (!email || !password) {
        throw new ValidationError('email and password are required');
      }
      if (password.length < 8) {
        throw new ValidationError('password must be at least 8 characters');
      }

      const registerData: RegisterDTO = { email, password };
      if (firstName) registerData.firstName = firstName;
      if (lastName) registerData.lastName = lastName;

      const result = await this.authService.register(registerData);

      this.setRefreshCookie(res, result.tokens.refreshToken);

      res.status(201).json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
        }),
      );
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as Record<string, string>;

      if (!email || !password) {
        throw new ValidationError('email and password are required');
      }

      const result = await this.authService.login({ email, password });

      this.setRefreshCookie(res, result.tokens.refreshToken);

      res.json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
        }),
      );
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Refresh token comes from the httpOnly cookie — NOT the body
      const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;

      if (!refreshToken) {
        throw new ValidationError('Refresh token cookie missing');
      }

      const tokens = await this.authService.refresh(refreshToken);

      this.setRefreshCookie(res, tokens.refreshToken);

      res.json(successResponse({ accessToken: tokens.accessToken }));
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      // Clear the cookie regardless of whether the token was valid
      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth/refresh' });
      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (err) {
      next(err);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.user is set by authGuard — userId is guaranteed here
      const userId = req.user!.sub;
      await this.authService.logoutAll(userId);
      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth/refresh' });
      res.json(successResponse({ message: 'All sessions revoked' }));
    } catch (err) {
      next(err);
    }
  };

  private setRefreshCookie(res: Response, token: string): void {
    const isProd = process.env['NODE_ENV'] === 'production';
    res.cookie(REFRESH_COOKIE, token, getRefreshCookieOptions(isProd));
  }
}
