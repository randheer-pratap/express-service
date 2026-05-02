import { Request, Response } from 'express';
import { errorResponse } from '../../common/types/api.response';

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(
      errorResponse(
        'ROUTE_NOT_FOUND',
        `Cannot ${req.method} ${req.path}`,
        undefined,
        req.requestId,
      ),
    );
}
