import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import type { Dependencies } from '../../deps.js';
import { comments, users } from '../../db/schema.js';
import type { AuthUser } from '../../middleware/auth.js';
import { assertTicketAccess } from '../tickets/service.js';

export async function listComments({ db }: Dependencies, user: AuthUser, ticketId: string) {
  await assertTicketAccess(db, user, ticketId);
  return db
    .select({
      id: comments.id,
      body: comments.body,
      authorId: comments.authorId,
      authorName: users.name,
      authorRole: users.role,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.ticketId, ticketId))
    .orderBy(asc(comments.createdAt));
}

export async function addComment(
  { db, eventBus }: Dependencies,
  user: AuthUser,
  ticketId: string,
  body: string,
) {
  const ticket = await assertTicketAccess(db, user, ticketId);
  if (user.role !== 'admin' && ticket.authorId !== user.id) {
    // assertTicketAccess already enforces ownership; kept as defense in depth.
    throw new Error('Forbidden');
  }

  const at = new Date();
  const [comment] = await db
    .insert(comments)
    .values({ id: randomUUID(), ticketId, authorId: user.id, body, createdAt: at, updatedAt: at })
    .returning();

  await eventBus.emit({
    type: 'comment.added',
    ticketId,
    actorId: user.id,
    actorRole: user.role,
    title: ticket.title,
    at,
    metadata: { commentId: comment.id, preview: body.slice(0, 120) },
    notify: user.role === 'admin' ? { userIds: [ticket.authorId] } : { role: 'admin' },
  });

  return {
    ...comment,
    authorName: user.name,
    authorRole: user.role,
  };
}
