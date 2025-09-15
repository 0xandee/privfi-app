import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      stack: err.stack
    });

    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error'
    });
  }

  logger.error('Unexpected error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  return res.status(500).json({
    error: 'Internal server error',
    status: 'error'
  });
};