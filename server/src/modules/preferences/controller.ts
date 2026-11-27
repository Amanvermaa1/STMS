import { Router } from 'express';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import { confirmPasswordSchema, preferencesSchema } from '../../validation.js';
import { clearSessionCookies } from '../auth/service.js';
import {
  deleteUserData,
  exportUserData,
  getPreferences,
  updatePreferences,
} from './service.js';

export function createPreferencesRouter(deps: Dependencies): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/preferences',
    asyncHandler(async (req, res) => {
      res.json({ preferences: await getPreferences(deps, currentUser(req)) });
    }),
  );

  router.patch(
    '/preferences',
    validate(preferencesSchema),
    asyncHandler(async (req, res) => {
      res.json({ preferences: await updatePreferences(deps, currentUser(req), res.locals.validatedBody) });
    }),
  );

  router.get(
    '/data',
    asyncHandler(async (req, res) => {
      res.json({ data: await exportUserData(deps, currentUser(req)) });
    }),
  );

  router.delete(
    '/data',
    validate(confirmPasswordSchema),
    asyncHandler(async (req, res) => {
      await deleteUserData(deps, currentUser(req), res.locals.validatedBody.password);
      clearSessionCookies(res);
      res.status(204).end();
    }),
  );

  return router;
}
