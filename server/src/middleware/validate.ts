import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../utils/errors.js';

export function validate(schema: ZodType, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(badRequest('Validation failed', result.error.flatten()));
    }
    if (source === 'body') res.locals.validatedBody = result.data;
    if (source === 'query') res.locals.validatedQuery = result.data;
    if (source === 'params') res.locals.validatedParams = result.data;
    next();
  };
}
