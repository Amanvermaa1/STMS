import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdmin, createTicketAs, loginUser, makeApp, registerUser } from './helpers.js';

describe('ticket management', () => {
  it('creates a ticket for the logged-in user and lists only own tickets', async () => {
    const alice = request.agent(makeApp());
    const bob = request.agent(makeApp());
    await registerUser(alice, 'ticket-owner@example.com');
    await registerUser(bob, 'other-user@example.com');

    const ticket = await createTicketAs(alice, { priority: 'urgent', category: 'billing' });
    expect(ticket.status).toBe('open');

    const aliceList = await alice.get('/api/tickets').expect(200);
    expect(aliceList.body.pagination.total).toBe(1);
    expect(aliceList.body.tickets).toBeUndefined();
    expect(aliceList.body.items[0].priority).toBe('urgent');

    const bobList = await bob.get('/api/tickets').expect(200);
    expect(bobList.body.pagination.total).toBe(0);
  });

  it('prevents one user from reading or editing another user ticket', async () => {
    const alice = request.agent(makeApp());
    const bob = request.agent(makeApp());
    await registerUser(alice, 'owner2@example.com');
    await registerUser(bob, 'intruder@example.com');
    const ticket = await createTicketAs(alice);

    await bob.get(`/api/tickets/${ticket.id}`).expect(403);
    await bob.patch(`/api/tickets/${ticket.id}`).send({ title: 'Hacked title' }).expect(403);
    await bob.delete(`/api/tickets/${ticket.id}`).expect(403);
  });

  it('supports admin filtering, sorting, searching and pagination', async () => {
    const user = request.agent(makeApp());
    await registerUser(user, 'filter@example.com');
    await createTicketAs(user, { title: 'Billing invoice wrong', priority: 'low', category: 'billing' });
    await createTicketAs(user, { title: 'VPN disconnects', priority: 'urgent', category: 'technical' });

    const admin = await createAdmin();
    const adminAgent = await loginUser(admin.email, 'AdminPassword123');

    const filtered = await adminAgent
      .get('/api/admin/tickets')
      .query({ priority: 'urgent', search: 'VPN', page: 1, limit: 5 })
      .expect(200);
    expect(filtered.body.pagination.total).toBe(1);
    expect(filtered.body.items[0].title).toBe('VPN disconnects');

    const paged = await adminAgent
      .get('/api/admin/tickets')
      .query({ page: 2, limit: 1, sortBy: 'priority', sortOrder: 'asc' })
      .expect(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.pagination.total).toBe(2);
    expect(paged.body.pagination.totalPages).toBe(2);

    await adminAgent.get('/api/admin/tickets').query({ limit: 100 }).expect(400);
  });

  it('allows owners to edit open tickets but blocks editing resolved ones', async () => {
    const user = request.agent(makeApp());
    await registerUser(user, 'editor@example.com');
    const ticket = await createTicketAs(user);

    await user
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: 'Updated printer issue', priority: 'low' })
      .expect(200);

    const admin = await createAdmin();
    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    await adminAgent
      .patch(`/api/admin/tickets/${ticket.id}/status`)
      .send({ status: 'resolved' })
      .expect(200);

    await user.patch(`/api/tickets/${ticket.id}`).send({ title: 'Too late' }).expect(409);
  });

  it('deletes only eligible tickets', async () => {
    const user = request.agent(makeApp());
    await registerUser(user, 'deleter@example.com');
    const withComment = await createTicketAs(user);
    await user
      .post(`/api/tickets/${withComment.id}/comments`)
      .send({ body: 'I am still experiencing this issue.' })
      .expect(201);
    await user.delete(`/api/tickets/${withComment.id}`).expect(409);

    const openTicket = await createTicketAs(user, { title: 'Delete me please' });
    await user.delete(`/api/tickets/${openTicket.id}`).expect(204);
    await user.get(`/api/tickets/${openTicket.id}`).expect(404);
  });

  it('handles comments with ownership rules', async () => {
    const owner = request.agent(makeApp());
    const other = request.agent(makeApp());
    await registerUser(owner, 'comment-owner@example.com');
    await registerUser(other, 'comment-other@example.com');
    const ticket = await createTicketAs(owner);

    await owner
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'This started after yesterday update.' })
      .expect(201);
    await other
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'Not my ticket' })
      .expect(403);

    const admin = await createAdmin();
    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    await adminAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ body: 'We are looking into it now.' })
      .expect(201);

    const comments = await owner.get(`/api/tickets/${ticket.id}/comments`).expect(200);
    expect(comments.body.comments).toHaveLength(2);
    expect(comments.body.comments[1].authorRole).toBe('admin');
  });

  it('returns scoped statistics', async () => {
    const user = request.agent(makeApp());
    await registerUser(user, 'stats@example.com');
    await createTicketAs(user, { priority: 'urgent' });
    await createTicketAs(user, { priority: 'low' });

    const stats = await user.get('/api/tickets/stats').expect(200);
    expect(stats.body.stats.total).toBe(2);
    expect(stats.body.stats.byPriority.urgent).toBe(1);
    expect(stats.body.stats.byStatus.open).toBe(2);
  });
});
