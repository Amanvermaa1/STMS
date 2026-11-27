import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import {
  activityLogs,
  analyticsEvents,
  comments,
  notifications,
  tickets,
  userPreferences,
  users,
  type UserPreferenceValues,
} from '../../db/schema.js';
import type { AuthUser } from '../../middleware/auth.js';
import { unauthorized } from '../../utils/errors.js';
import { verifyPassword } from '../../utils/password.js';

const DEFAULT_PREFERENCES: UserPreferenceValues = {
  dashboard: { widgets: ['summary', 'recent', 'priority'] },
  tickets: {
    search: '',
    status: '',
    priority: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 10,
  },
  privacy: { analyticsOptIn: true, productUpdatesOptIn: false },
};

export async function getPreferences({ db }: { db: Database }, user: AuthUser): Promise<UserPreferenceValues> {
  const [row] = await db
    .select({ values: userPreferences.values })
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  return {
    dashboard: { ...DEFAULT_PREFERENCES.dashboard, ...row?.values?.dashboard },
    tickets: { ...DEFAULT_PREFERENCES.tickets, ...row?.values?.tickets },
    privacy: { ...DEFAULT_PREFERENCES.privacy, ...row?.values?.privacy },
  };
}

export async function updatePreferences(
  { db }: { db: Database },
  user: AuthUser,
  patch: UserPreferenceValues,
): Promise<UserPreferenceValues> {
  const current = await getPreferences({ db }, user);
  const merged: UserPreferenceValues = {
    dashboard: { ...current.dashboard, ...patch.dashboard },
    tickets: { ...current.tickets, ...patch.tickets },
    privacy: { ...current.privacy, ...patch.privacy },
  };
  const at = new Date();

  await db
    .insert(userPreferences)
    .values({ userId: user.id, values: merged, updatedAt: at })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { values: merged, updatedAt: at },
    });

  return merged;
}

export async function analyticsEnabled({ db }: { db: Database }, user: AuthUser): Promise<boolean> {
  const preferences = await getPreferences({ db }, user);
  return preferences.privacy?.analyticsOptIn !== false;
}

export async function exportUserData({ db }: { db: Database }, user: AuthUser) {
  const [account] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, user.id));
  if (!account) throw unauthorized();

  const [preferences, ownTickets, ownComments, ownNotifications, ownActivity, ownEvents] = await Promise.all([
    getPreferences({ db }, user),
    db.select().from(tickets).where(eq(tickets.authorId, user.id)).orderBy(desc(tickets.createdAt)),
    db.select().from(comments).where(eq(comments.authorId, user.id)).orderBy(desc(comments.createdAt)),
    db.select().from(notifications).where(eq(notifications.recipientId, user.id)).orderBy(desc(notifications.createdAt)),
    db.select().from(activityLogs).where(eq(activityLogs.actorId, user.id)).orderBy(desc(activityLogs.createdAt)),
    db.select().from(analyticsEvents).where(eq(analyticsEvents.userId, user.id)).orderBy(desc(analyticsEvents.createdAt)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account,
    preferences,
    tickets: ownTickets,
    comments: ownComments,
    notifications: ownNotifications,
    activity: ownActivity,
    analytics: ownEvents,
  };
}

export async function deleteUserData(
  { db }: { db: Database },
  user: AuthUser,
  password: string,
): Promise<void> {
  const [account] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id));
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    throw unauthorized('Incorrect password. Account deletion was cancelled.');
  }

  await db.delete(activityLogs).where(eq(activityLogs.actorId, user.id));
  await db.delete(analyticsEvents).where(and(eq(analyticsEvents.userId, user.id)));
  await db.delete(users).where(eq(users.id, user.id));
}
