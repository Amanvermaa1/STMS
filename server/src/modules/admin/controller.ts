import { Router } from 'express';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import { pathParam } from '../../utils/params.js';
import { listTicketsSchema, prioritySchema, statusSchema } from '../../validation.js';
import { getStats, listTickets, updatePriority, updateStatus } from '../tickets/service.js';

export function createAdminRouter(deps: Dependencies): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    '/tickets',
    validate(listTicketsSchema, 'query'),
    asyncHandler(async (req, res) => {
      res.json(await listTickets(deps, currentUser(req), res.locals.validatedQuery));
    }),
  );

  router.get(
    '/stats',
    asyncHandler(async (req, res) => {
      res.json({ stats: await getStats(deps, currentUser(req)) });
    }),
  );

  router.patch(
    '/tickets/:id/status',
    validate(statusSchema),
    asyncHandler(async (req, res) => {
      const ticket = await updateStatus(
        deps,
        currentUser(req),
        pathParam(req, 'id'),
        res.locals.validatedBody.status,
      );
      res.json({ ticket });
    }),
  );

  router.patch(
    '/tickets/:id/priority',
    validate(prioritySchema),
    asyncHandler(async (req, res) => {
      const ticket = await updatePriority(
        deps,
        currentUser(req),
        pathParam(req, 'id'),
        res.locals.validatedBody.priority,
      );
      res.json({ ticket });
    }),
  );

  return router;
}
