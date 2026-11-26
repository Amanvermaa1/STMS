import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import {
  activityLogs,
  comments,
  tickets,
  users,
  type TicketRow,
} from '../../db/schema.js';
import type { AuthUser } from '../../middleware/auth.js';
import { conflict, forbidden, notFound } from '../../utils/errors.js';
import { categories, priorities, statuses, type ListTicketsQuery } from '../../validation.js';
import type { Dependencies } from '../../deps.js';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function assertTicketAccess(
  db: Database,
  user: AuthUser,
  ticketId: string,
): Promise<TicketRow> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) throw notFound('Ticket not found');
  if (user.role !== 'admin' && ticket.authorId !== user.id) throw forbidden();
  return ticket;
}

export async function createTicket(
  { db, eventBus }: Dependencies,
  user: AuthUser,
  input: { title: string; description: string; category: string; priority: string },
) {
  const at = new Date();
  const [ticket] = await db
    .insert(tickets)
    .values({
      id: randomUUID(),
      authorId: user.id,
      title: input.title,
      description: input.description,
      category: input.category as TicketRow['category'],
      priority: input.priority as TicketRow['priority'],
      status: 'open',
      createdAt: at,
      updatedAt: at,
    })
    .returning();

  await eventBus.emit({
    type: 'ticket.created',
    ticketId: ticket.id,
    actorId: user.id,
    actorRole: user.role,
    title: ticket.title,
    at,
    notify: { role: 'admin' },
  });

  return ticket;
}

export async function listTickets(
  { db }: Dependencies,
  user: AuthUser,
  query: ListTicketsQuery,
) {
  const filters: SQL[] = [];
  if (user.role !== 'admin') filters.push(eq(tickets.authorId, user.id));
  if (query.status) filters.push(eq(tickets.status, query.status));
  if (query.priority) filters.push(eq(tickets.priority, query.priority));
  if (query.category) filters.push(eq(tickets.category, query.category));
  if (query.search) {
    const pattern = `%${escapeLike(query.search)}%`;
    filters.push(sql`(${ilike(tickets.title, pattern)} or ${ilike(tickets.description, pattern)})`);
  }
  const where = filters.length ? and(...filters) : undefined;

  const priorityOrder = sql<number>`case ${tickets.priority} when 'low' then 1 when 'medium' then 2 when 'high' then 3 when 'urgent' then 4 else 0 end`;
  const direction = query.sortOrder === 'asc' ? asc : desc;
  const sortColumn =
    query.sortBy === 'priority'
      ? priorityOrder
      : query.sortBy === 'status'
        ? tickets.status
        : query.sortBy === 'updatedAt'
          ? tickets.updatedAt
          : tickets.createdAt;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: tickets.id,
        title: tickets.title,
        category: tickets.category,
        priority: tickets.priority,
        status: tickets.status,
        authorId: tickets.authorId,
        authorName: users.name,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.authorId, users.id))
      .where(where)
      .orderBy(direction(sortColumn), desc(tickets.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tickets)
      .where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getTicket({ db }: Dependencies, user: AuthUser, ticketId: string) {
  const ticket = await assertTicketAccess(db, user, ticketId);
  const [author] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, ticket.authorId));
  return { ...ticket, author };
}

export async function updateTicket(
  { db, eventBus }: Dependencies,
  user: AuthUser,
  ticketId: string,
  input: Partial<Pick<TicketRow, 'title' | 'description' | 'category' | 'priority'>>,
) {
  const existing = await assertTicketAccess(db, user, ticketId);
  if (user.role !== 'admin' && !['open', 'in_progress'].includes(existing.status)) {
    throw conflict('A resolved or closed ticket cannot be edited');
  }

  const at = new Date();
  const [updated] = await db
    .update(tickets)
    .set({ ...input, updatedAt: at })
    .where(eq(tickets.id, ticketId))
    .returning();

  await eventBus.emit({
    type: 'ticket.updated',
    ticketId,
    actorId: user.id,
    actorRole: user.role,
    title: updated.title,
    at,
    metadata: { changedFields: Object.keys(input) },
    notify: user.role === 'admin' ? { userIds: [existing.authorId] } : { role: 'admin' },
  });

  return updated;
}

export async function deleteTicket(
  { db }: Dependencies,
  user: AuthUser,
  ticketId: string,
): Promise<void> {
  const existing = await assertTicketAccess(db, user, ticketId);
  if (user.role !== 'admin' && existing.status !== 'open') {
    throw conflict('Only open tickets can be deleted');
  }

  const commentCount = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.ticketId, ticketId));
  if ((commentCount[0]?.value ?? 0) > 0) {
    throw conflict('Tickets with comments cannot be deleted');
  }

  await db.delete(tickets).where(eq(tickets.id, ticketId));
}

export async function updateStatus(
  { db, eventBus }: Dependencies,
  user: AuthUser,
  ticketId: string,
  status: TicketRow['status'],
) {
  const existing = await assertTicketAccess(db, user, ticketId);
  const at = new Date();
  const [updated] = await db
    .update(tickets)
    .set({ status, updatedAt: at })
    .where(eq(tickets.id, ticketId))
    .returning();

  const base = {
    ticketId,
    actorId: user.id,
    actorRole: user.role,
    title: updated.title,
    at,
    notify: { userIds: [existing.authorId] },
  };

  await eventBus.emit({
    ...base,
    type: 'ticket.status_changed',
    metadata: { from: existing.status, to: status },
  });

  if (status === 'resolved') {
    await eventBus.emit({ ...base, type: 'ticket.resolved', metadata: { from: existing.status } });
  }

  return updated;
}

export async function updatePriority(
  { db, eventBus }: Dependencies,
  user: AuthUser,
  ticketId: string,
  priority: TicketRow['priority'],
) {
  const existing = await assertTicketAccess(db, user, ticketId);
  const at = new Date();
  const [updated] = await db
    .update(tickets)
    .set({ priority, updatedAt: at })
    .where(eq(tickets.id, ticketId))
    .returning();

  await eventBus.emit({
    type: 'ticket.updated',
    ticketId,
    actorId: user.id,
    actorRole: user.role,
    title: updated.title,
    at,
    metadata: { changedFields: ['priority'], from: existing.priority, to: priority },
    notify: { userIds: [existing.authorId] },
  });

  return updated;
}

export async function getStats({ db }: Dependencies, user: AuthUser) {
  const scope = user.role === 'admin' ? undefined : eq(tickets.authorId, user.id);
  const [statusRows, priorityRows, categoryRows, totalRows] = await Promise.all([
    db
      .select({ key: tickets.status, value: sql<number>`count(*)::int` })
      .from(tickets)
      .where(scope)
      .groupBy(tickets.status),
    db
      .select({ key: tickets.priority, value: sql<number>`count(*)::int` })
      .from(tickets)
      .where(scope)
      .groupBy(tickets.priority),
    db
      .select({ key: tickets.category, value: sql<number>`count(*)::int` })
      .from(tickets)
      .where(scope)
      .groupBy(tickets.category),
    db.select({ value: sql<number>`count(*)::int` }).from(tickets).where(scope),
  ]);

  const toMap = (keys: readonly string[], rows: Array<{ key: string; value: number }>) =>
    Object.fromEntries(keys.map((key) => [key, rows.find((row) => row.key === key)?.value ?? 0]));

  return {
    total: totalRows[0]?.value ?? 0,
    byStatus: toMap(statuses, statusRows),
    byPriority: toMap(priorities, priorityRows),
    byCategory: toMap(categories, categoryRows),
  };
}

export async function listActivity(
  { db }: Dependencies,
  user: AuthUser,
  ticketId: string,
) {
  await assertTicketAccess(db, user, ticketId);
  return db
    .select({
      id: activityLogs.id,
      eventType: activityLogs.eventType,
      actorRole: activityLogs.actorRole,
      actorName: users.name,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .where(eq(activityLogs.ticketId, ticketId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(100);
}
