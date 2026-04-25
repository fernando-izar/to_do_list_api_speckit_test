import { Request, Response, NextFunction } from 'express';

export interface HttpError extends Error {
  status?: number;
}

/** Global error handler — formats all uncaught errors as JSON. */
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
