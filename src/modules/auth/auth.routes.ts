import { Router } from 'express';
import passport from 'passport';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { authGuard } from '../../common/middlewares/auth-guard.middleware';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';
import { IAuthService } from '../../common/interfaces/auth.interface';

export function createAuthRouter(): Router {
  const router = Router();
  const authService = container.resolve<IAuthService>(TOKENS.AuthService);
  const controller = new AuthController(authService);
  const oauthController = new OAuthController();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  // router.post('/logout-all', authGuard, controller.logoutAll); // requires auth
  router.get('/me', authGuard, async (req, res) => {
    // Quick profile endpoint — no service call needed
    res.json(successResponse(req.user));
  });

  // --- Google OAuth ---
  router.get('/google', passport.authenticate('google', { session: false }));
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/api/v1/auth/oauth/failure',
    }),
    oauthController.handleCallback,
  );

  // --- GitHub OAuth ---
  router.get('/github', passport.authenticate('github', { session: false }));
  router.get(
    '/github/callback',
    passport.authenticate('github', {
      session: false,
      failureRedirect: '/api/v1/auth/oauth/failure',
    }),
    oauthController.handleCallback,
  );

  // --- OAuth failure fallback ---
  router.get('/oauth/failure', oauthController.handleFailure);
  return router;
}

import { successResponse } from '../../common/types/api.response';
