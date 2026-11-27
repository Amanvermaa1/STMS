import { Router } from 'express';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import { analyticsBatchSchema } from '../../validation.js';
import { getInsights, recordEvents } from './service.js';

export function createAnalyticsRouter(deps: Dependencies): Router {
  const router = Router();
  router.use(requireAuth);

  router.post(
    '/events',
    validate(analyticsBatchSchema),
    asyncHandler(async (req, res) => {
      const recorded = await recordEvents(deps, currentUser(req), res.locals.validatedBody.events);
      res.status(202).json({ recorded });
    }),
  );

  router.get(
    '/insights',
    requireAdmin,
    asyncHandler(async (_req, res) => {
      res.json({ insights: await getInsights(deps) });
    }),
  );

  return router;
}
