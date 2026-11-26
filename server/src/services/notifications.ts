import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db as _defaultDb } from '../db/index.js';
import { notifications, users } from '../db/schema.js';
import type { DomainEvent } from '../events/types.js';

type Db = typeof _defaultDb;

function messageFor(event: DomainEvent): string {
  const shortId = event.ticketId.slice(0, 8);
  switch (event.type) {
    case 'ticket.created':
      return `New ticket #${shortId}: ${event.title}`;
    case 'ticket.updated':
      return event.actorRole === 'admin'
        ? `Admin updated your ticket #${shortId}: ${event.title}`
        : `Ticket #${shortId} was updated: ${event.title}`;
    case 'ticket.status_changed':
      return `Ticket #${shortId} status changed to ${String(event.metadata?.to ?? '')}`;
    case 'ticket.resolved':
      return `Your ticket #${shortId} was resolved: ${event.title}`;
    case 'comment.added':
      return event.actorRole === 'admin'
        ? `Admin commented on your ticket #${shortId}: ${event.title}`
        : `New comment on ticket #${shortId}: ${event.title}`;
  }
}

async function resolveRecipients(db: Db, event: DomainEvent): Promise<string[]> {
  const ids = new Set<string>(event.notify?.userIds ?? []);

  if (event.notify?.role === 'admin') {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
    admins.forEach((admin) => ids.add(admin.id));
  }

  ids.delete(event.actorId);
  return [...ids];
}

/** Creates in-app notifications and returns recipient emails for optional SMTP delivery. */
export async function createNotifications(
  db: Db,
  event: DomainEvent,
): Promise<Array<{ userId: string; email: string; message: string }>> {
  const recipientIds = await resolveRecipients(db, event);
  if (recipientIds.length === 0) return [];

  const people = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, recipientIds));

  const message = messageFor(event);
  await db.insert(notifications).values(
    people.map((person) => ({
      id: randomUUID(),
      recipientId: person.id,
      ticketId: event.ticketId,
      type: event.type,
      message,
      createdAt: event.at,
    })),
  );

  return people.map((person) => ({ userId: person.id, email: person.email, message }));
}
