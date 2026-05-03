import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authGuard } from '../../common/middlewares/auth-guard.middleware';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';
import { IAuthService } from '../../common/interfaces/auth.interface';

export function createAuthRouter(): Router {
  const router = Router();
  const authService = container.resolve<IAuthService>(TOKENS.AuthService);
  const controller = new AuthController(authService);

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/logout-all', authGuard, controller.logoutAll); // requires auth
  router.get('/me', authGuard, async (req, res) => {
    // Quick profile endpoint — no service call needed
    res.json(successResponse(req.user));
  });

  return router;
}

import { successResponse } from '../../common/types/api.response';
