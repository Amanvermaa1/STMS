import { Router } from 'express';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import { assistantQuerySchema } from '../../validation.js';
import { queryAssistant } from './service.js';

export function createAssistantRouter(deps: Dependencies): Router {
  const router = Router();
  router.use(requireAuth);

  router.post(
    '/query',
    validate(assistantQuerySchema),
    asyncHandler(async (req, res) => {
      res.json(await queryAssistant(deps, currentUser(req), res.locals.validatedBody.query));
    }),
  );

  return router;
}
