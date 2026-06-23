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
  const isProduction = process.env.NODE_ENV === 'production';
  const message = (statusCode === 500 && isProduction) ? 'Something went wrong' : (err.message || 'Internal Server Error');
  const cause = (statusCode === 500 && isProduction) ? null : ((err as any).cause?.message || null);
  const details = (statusCode === 500 && isProduction) ? null : (err.details || null);

  res.status(statusCode).json({
    success: false,
    error: message,
    cause,
    details,
  });
}