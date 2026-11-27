import { randomUUID } from 'node:crypto';
import { desc, gte, sql } from 'drizzle-orm';
import type { Dependencies } from '../../deps.js';
import { analyticsEvents } from '../../db/schema.js';
import type { AuthUser } from '../../middleware/auth.js';
import { analyticsEnabled } from '../preferences/service.js';
import { analyticsEventTypes, type analyticsEventSchema } from '../../validation.js';
import type { z } from 'zod';

type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export async function recordEvents(
  { db }: Dependencies,
  user: AuthUser,
  events: AnalyticsEvent[],
): Promise<number> {
  if (!(await analyticsEnabled({ db }, user))) return 0;
  if (events.length === 0) return 0;

  await db.insert(analyticsEvents).values(
    events.map((event) => ({
      id: randomUUID(),
      userId: user.id,
      type: event.type,
      metadata: event.metadata,
      createdAt: new Date(),
    })),
  );
  return events.length;
}

export async function getInsights({ db }: Dependencies) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [byType, total, recent] = await Promise.all([
    db
      .select({ type: analyticsEvents.type, value: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, since))
      .groupBy(analyticsEvents.type),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, since)),
    db
      .select({ type: analyticsEvents.type, createdAt: analyticsEvents.createdAt })
      .from(analyticsEvents)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(20),
  ]);

  return {
    windowDays: 30,
    total: total[0]?.value ?? 0,
    byType: Object.fromEntries(
      analyticsEventTypes.map((type) => [type, byType.find((row) => row.type === type)?.value ?? 0]),
    ),
    recent: recent.map((row) => ({ type: row.type, createdAt: row.createdAt })),
  };
}
