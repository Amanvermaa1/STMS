import { Router } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Dependencies } from '../../deps.js';
import { notifications } from '../../db/schema.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { asyncHandler, notFound } from '../../utils/errors.js';
import { pathParam } from '../../utils/params.js';

export function createNotificationsRouter({ db }: Dependencies): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      const unread = rows.filter((row) => row.readAt === null).length;
      res.json({ notifications: rows, unread });
    }),
  );

  router.patch(
    '/:id/read',
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      const [updated] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, pathParam(req, 'id')), eq(notifications.recipientId, user.id), isNull(notifications.readAt)))
        .returning();
      if (!updated) throw notFound('Notification not found or already read');
      res.json({ notification: updated });
    }),
  );

  return router;
}
