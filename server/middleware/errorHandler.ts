import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details: Record<string, any>;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details: Record<string, any> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId || `req_${Date.now()}`;
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected server error occurred.';
  const details = err.details || {};

  logger.error({
    event: 'ERROR_HANDLED',
    requestId,
    statusCode,
    code,
    message,
    url: req.originalUrl,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(statusCode).json({
    success: false,
    requestId,
    error: {
      code,
      message,
      details,
    },
  });
};
