import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('💥 Error caught by handler:', {
    message: err.message,
    stack: err.stack,
    cause: (err as any).cause,
    details: err.details,
    statusCode: err.statusCode,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    cause: (err as any).cause?.message || null,
    details: err.details || null,
  });
}