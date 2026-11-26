import { Router } from 'express';
import type { Dependencies } from '../../deps.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/errors.js';
import { pathParam } from '../../utils/params.js';
import { commentSchema, createTicketSchema, listTicketsSchema, updateTicketSchema } from '../../validation.js';
import { addComment, listComments } from '../comments/service.js';
import {
  createTicket,
  deleteTicket,
  getStats,
  getTicket,
  listActivity,
  listTickets,
  updateTicket,
} from './service.js';

export function createTicketsRouter(deps: Dependencies): Router {
  const router = Router();
  router.use(requireAuth);

  router.post(
    '/',
    validate(createTicketSchema),
    asyncHandler(async (req, res) => {
      const ticket = await createTicket(deps, currentUser(req), res.locals.validatedBody);
      res.status(201).json({ ticket });
    }),
  );

  router.get(
    '/',
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

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json({ ticket: await getTicket(deps, currentUser(req), pathParam(req, 'id')) });
    }),
  );

  router.patch(
    '/:id',
    validate(updateTicketSchema),
    asyncHandler(async (req, res) => {
      const ticket = await updateTicket(deps, currentUser(req), pathParam(req, 'id'), res.locals.validatedBody);
      res.json({ ticket });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await deleteTicket(deps, currentUser(req), pathParam(req, 'id'));
      res.status(204).end();
    }),
  );

  router.get(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      res.json({ comments: await listComments(deps, currentUser(req), pathParam(req, 'id')) });
    }),
  );

  router.post(
    '/:id/comments',
    validate(commentSchema),
    asyncHandler(async (req, res) => {
      const comment = await addComment(
        deps,
        currentUser(req),
        pathParam(req, 'id'),
        res.locals.validatedBody.body,
      );
      res.status(201).json({ comment });
    }),
  );

  router.get(
    '/:id/activity',
    asyncHandler(async (req, res) => {
      res.json({ activity: await listActivity(deps, currentUser(req), pathParam(req, 'id')) });
    }),
  );

  return router;
}
