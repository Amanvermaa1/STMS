import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdmin, loginUser, makeApp, registerUser } from './helpers.js';

describe('authentication and authorization', () => {
  it('registers a user, issues cookies and returns the current user', async () => {
    const agent = request.agent(makeApp());
    const user = await registerUser(agent, 'alice@example.com');

    expect(user.role).toBe('user');
    expect(user.id).toBeTruthy();

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('alice@example.com');
  });

  it('never allows registration to self-assign admin', async () => {
    const agent = request.agent(makeApp());
    const response = await agent
      .post('/api/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'Password123', role: 'admin' })
      .expect(201);
    expect(response.body.user.role).toBe('user');
  });

  it('rejects duplicate emails and invalid payloads', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'duplicate@example.com');

    await request(makeApp())
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'duplicate@example.com', password: 'Password123' })
      .expect(409);

    await request(makeApp())
      .post('/api/auth/register')
      .send({ name: 'A', email: 'bad-email', password: 'short' })
      .expect(400);
  });

  it('rejects a wrong password', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'bob@example.com');
    await request(makeApp())
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'WrongPassword123' })
      .expect(401);
  });

  it('blocks non-admins from admin endpoints', async () => {
    const userAgent = request.agent(makeApp());
    await registerUser(userAgent, 'regular@example.com');
    const admin = await createAdmin();
    const ticket = await userAgent
      .post('/api/tickets')
      .send({ title: 'Need help', description: 'Something is broken in the app today.' })
      .expect(201);

    await userAgent
      .patch(`/api/admin/tickets/${ticket.body.ticket.id}/status`)
      .send({ status: 'resolved' })
      .expect(403);

    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    await adminAgent
      .patch(`/api/admin/tickets/${ticket.body.ticket.id}/status`)
      .send({ status: 'resolved' })
      .expect(200);
  });

  it('refreshes the session and clears it on logout', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'refresh@example.com');

    await agent.post('/api/auth/refresh').expect(200);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);

    await request.agent(makeApp()).get('/api/auth/me').expect(401);
  });
});
