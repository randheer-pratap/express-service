import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { OAuthResult } from '../../common/interfaces/oauth.interface';
import { InternalError } from '../../common/errors/http-errors';

/**
 * Why redirect with accessToken in the URL query string?
 *
 * OAuth is a browser redirect flow — the callback is a GET request.
 * We can't set a response body that JavaScript reads (it's a redirect).
 * We CAN set cookies (which we do for the refresh token) and we CAN
 * put the access token in the redirect URL as a query param.
 *
 * The frontend JavaScript at /auth/callback reads the query param,
 * stores it in memory, and immediately removes it from the URL using
 * history.replaceState — so it never sits in browser history.
 *
 * Alternative: use a one-time code pattern (store tokens server-side
 * keyed by a short-lived code, redirect with code, frontend exchanges
 * it for tokens via POST). More secure, more complex. Use this in
 * high-security contexts.
 */
export class OAuthController {
  handleCallback = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Passport placed the OAuthResult on req.user in the verify callback
      const result = req.user as OAuthResult | undefined;

      if (!result) {
        throw new InternalError('OAuth callback received no user data');
      }

      const isProd = process.env['NODE_ENV'] === 'production';

      // Set refresh token as httpOnly cookie — same as password login
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax', // 'lax' (not 'strict') because this IS a cross-site redirect
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to frontend with access token + isNewUser flag
      const redirectUrl = new URL(config.oauth.successRedirect);
      redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
      redirectUrl.searchParams.set('isNewUser', String(result.isNewUser));

      res.redirect(redirectUrl.toString());
    } catch (err) {
      next(err);
    }
  };

  handleFailure = (_req: Request, res: Response): void => {
    res.redirect(config.oauth.failureRedirect);
  };
}
