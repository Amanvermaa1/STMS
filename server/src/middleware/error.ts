import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, notFound } from '../utils/errors.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`Route ${req.method} ${req.path} does not exist`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten() },
    });
    return;
  }

  const dbError = error as { code?: string; detail?: string };
  if (dbError?.code === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A unique constraint was violated' } });
    return;
  }
  if (dbError?.code === '23503') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Referenced record does not exist' } });
    return;
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
