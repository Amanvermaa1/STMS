import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { eq } from 'drizzle-orm';
import type { Dependencies } from '../../deps.js';
import { users } from '../../db/schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, notFound } from '../../utils/errors.js';
import { loginSchema, registerSchema } from '../../validation.js';
import {
  authenticateUser,
  issueSession,
  logoutSession,
  refreshAccessToken,
  refreshSession,
  registerUser,
  toPublicUser,
} from './service.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

export function createAuthRouter({ db }: Dependencies): Router {
  const router = Router();

  router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const input = res.locals.validatedBody as {
        name: string;
        email: string;
        password: string;
        role?: 'admin';
      };
      const user = await registerUser(db, input);
      await issueSession(db, res, user);
      res.status(201).json({ user });
    }),
  );

  router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = res.locals.validatedBody as { email: string; password: string };
      const user = await authenticateUser(db, email, password);
      await issueSession(db, res, user);
      res.json({ user });
    }),
  );

  router.post(
    '/refresh',
    asyncHandler(async (req, res) => {
      const user = await refreshSession(db, req, res);
      res.json({ user });
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      await logoutSession(db, req, res);
      res.json({ message: 'Logged out successfully' });
    }),
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const [user] = await db.select().from(users).where(eq(users.id, req.authUser!.id));
      if (!user) throw notFound('Account not found');
      const publicUser = toPublicUser(user);
      const token = req.authUser!;
      if (
        publicUser.role !== token.role ||
        publicUser.email !== token.email ||
        publicUser.name !== token.name
      ) {
        refreshAccessToken(res, publicUser);
      }
      res.json({ user: publicUser });
    }),
  );

  return router;
}
