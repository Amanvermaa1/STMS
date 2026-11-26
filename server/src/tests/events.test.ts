import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { activityLogs, notifications } from '../db/schema.js';
import { createAdmin, createTicketAs, loginUser, makeApp, registerUser } from './helpers.js';
import { db } from './db.js';

describe('event-driven actions', () => {
  it('logs ticket creation and notifies administrators', async () => {
    const admin = await createAdmin();
    const user = request.agent(makeApp());
    const registered = await registerUser(user, 'events-create@example.com');
    const ticket = await createTicketAs(user);

    const logs = await db.select().from(activityLogs).where(eq(activityLogs.ticketId, ticket.id));
    expect(logs.map((log) => log.eventType)).toEqual(['ticket.created']);
    expect(logs[0]?.actorId).toBe(registered.id);

    const notes = await db.select().from(notifications);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.recipientId).toBe(admin.id);
    expect(notes[0]?.message).toContain('New ticket');
  });

  it('emits status and resolved events when an admin resolves a ticket', async () => {
    const admin = await createAdmin();
    const user = request.agent(makeApp());
    const owner = await registerUser(user, 'events-resolve@example.com');
    const ticket = await createTicketAs(user);

    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    await adminAgent
      .patch(`/api/admin/tickets/${ticket.id}/status`)
      .send({ status: 'resolved' })
      .expect(200);

    const logs = await db.select().from(activityLogs).where(eq(activityLogs.ticketId, ticket.id));
    expect(logs.map((log) => log.eventType).sort()).toEqual([
      'ticket.created',
      'ticket.resolved',
      'ticket.status_changed',
    ]);

    const ownerNotes = await db.select().from(notifications).where(eq(notifications.recipientId, owner.id));
    expect(ownerNotes.map((note) => note.type)).toEqual(['ticket.status_changed', 'ticket.resolved']);

    const timeline = await user.get(`/api/tickets/${ticket.id}/activity`).expect(200);
    expect(timeline.body.activity).toHaveLength(3);
  });

  it('notifies the ticket owner when an admin comments', async () => {
    const admin = await createAdmin();
    const user = request.agent(makeApp());
    const owner = await registerUser(user, 'events-comment@example.com');
    const ticket = await createTicketAs(user);

    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    await adminAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'Fixed — please verify.' })
      .expect(201);

    const notes = await db.select().from(notifications).where(eq(notifications.recipientId, owner.id));
    expect(notes.map((note) => note.type)).toContain('comment.added');

    const inbox = await user.get('/api/notifications').expect(200);
    expect(inbox.body.unread).toBe(1);
    await user.patch(`/api/notifications/${notes[0]!.id}/read`).expect(200);
    const afterRead = await user.get('/api/notifications').expect(200);
    expect(afterRead.body.unread).toBe(0);
  });
});
