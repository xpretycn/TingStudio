import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(err: ErrorWithStatus, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[Error] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.error(`[Error] Message: ${err.message}`);

  if (err.stack) {
    console.error(`[Error] Stack:\n${err.stack}`);
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const response = {
    success: false,
    error: {
      message: status === 500 ? 'Internal server error' : err.message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    (response.error as any).stack = err.stack;
  }

  res.status(status).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    },
  });
}
