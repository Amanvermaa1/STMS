import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/token.js';

export interface AuthUser {
  id: string;
  role: 'user' | 'admin';
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.access_token as string | undefined;
    if (!token) return next(unauthorized('Please log in to continue'));

    const payload = verifyAccessToken(token);
    req.authUser = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch {
    next(unauthorized('Session expired. Please log in again'));
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (error?: unknown) => {
    if (error) return next(error);
    if (req.authUser?.role !== 'admin') {
      return next(forbidden('Administrator access required'));
    }
    next();
  });
}

export function currentUser(req: Request): AuthUser {
  if (!req.authUser) throw unauthorized();
  return req.authUser;
}
