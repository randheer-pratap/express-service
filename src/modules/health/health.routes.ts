import { Router, Request, Response, NextFunction } from 'express';
import { HealthService } from './health.service';
import { successResponse } from '../../common/types/api.response';
import { container } from '../../container';
import { TOKENS } from '../../container/tokens';

export function createHealthRouter(): Router {
  const router = Router();
  const healthService = container.resolve<HealthService>(TOKENS.HealthService);

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await healthService.getHealth();
      const statusCode = report.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(successResponse(report));
    } catch (err) {
      next(err); // passes to globalErrorHandler
    }
  });

  return router;
}
