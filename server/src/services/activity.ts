import { randomUUID } from 'node:crypto';
import { db as _defaultDb } from '../db/index.js';
import { activityLogs } from '../db/schema.js';
import type { DomainEvent } from '../events/types.js';

type Db = typeof _defaultDb;

export async function logActivity(db: Db, event: DomainEvent): Promise<void> {
  await db.insert(activityLogs).values({
    id: randomUUID(),
    ticketId: event.ticketId,
    actorId: event.actorId,
    actorRole: event.actorRole,
    eventType: event.type,
    metadata: {
      ...(event.metadata ?? {}),
      title: event.title,
      at: event.at.toISOString(),
    },
    createdAt: event.at,
  });
}
