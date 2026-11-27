import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdmin, createTicketAs, loginUser, makeApp, registerUser } from './helpers.js';

describe('personalization, analytics and assistant', () => {
  it('stores preferences and honours analytics opt-out', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'prefs@example.com');

    const initial = await agent.get('/api/me/preferences').expect(200);
    expect(initial.body.preferences.privacy.analyticsOptIn).toBe(true);

    const updated = await agent
      .patch('/api/me/preferences')
      .send({ tickets: { status: 'open', limit: 20 }, privacy: { analyticsOptIn: false } })
      .expect(200);
    expect(updated.body.preferences.tickets.status).toBe('open');
    expect(updated.body.preferences.tickets.limit).toBe(20);
    expect(updated.body.preferences.privacy.analyticsOptIn).toBe(false);

    const persisted = await agent.get('/api/me/preferences').expect(200);
    expect(persisted.body.preferences.tickets.status).toBe('open');

    const recorded = await agent
      .post('/api/analytics/events')
      .send({ events: [{ type: 'ticket.view', metadata: { detail: true } }] })
      .expect(202);
    expect(recorded.body.recorded).toBe(0);
  });

  it('records analytics and exposes insights only to administrators', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'analytics@example.com');

    const recorded = await agent
      .post('/api/analytics/events')
      .send({
        events: [
          { type: 'ticket.view', metadata: { detail: true } },
          { type: 'assistant.query', metadata: { resultCount: 2 } },
        ],
      })
      .expect(202);
    expect(recorded.body.recorded).toBe(2);

    await agent.get('/api/analytics/insights').expect(403);

    const admin = await createAdmin();
    const adminAgent = await loginUser(admin.email, 'AdminPassword123');
    const insights = await adminAgent.get('/api/analytics/insights').expect(200);
    expect(insights.body.insights.byType['ticket.view']).toBe(1);
    expect(insights.body.insights.byType['assistant.query']).toBe(1);
    expect(insights.body.insights.total).toBe(2);
  });

  it('answers assistant queries from the signed-in user tickets only', async () => {
    const alice = request.agent(makeApp());
    const bob = request.agent(makeApp());
    await registerUser(alice, 'assistant-alice@example.com');
    await registerUser(bob, 'assistant-bob@example.com');

    await createTicketAs(alice, { title: 'Billing invoice is wrong', category: 'billing', priority: 'high' });
    await createTicketAs(alice, { title: 'VPN disconnects', category: 'technical', priority: 'urgent' });
    await createTicketAs(bob, { title: 'Bob private ticket', category: 'billing' });

    const count = await alice
      .post('/api/assistant/query')
      .send({ query: 'how many urgent tickets do I have?' })
      .expect(200);
    expect(count.body.answer).toContain('1 ticket');

    const billing = await alice
      .post('/api/assistant/query')
      .send({ query: 'show my billing tickets' })
      .expect(200);
    expect(billing.body.total).toBe(1);
    expect(billing.body.tickets[0].title).toBe('Billing invoice is wrong');

    const search = await alice.post('/api/assistant/query').send({ query: 'find VPN' }).expect(200);
    expect(search.body.tickets[0].title).toBe('VPN disconnects');
    expect(JSON.stringify(search.body)).not.toContain('Bob private ticket');
  });

  it('exports account data and deletes it only after password confirmation', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'export@example.com');
    await createTicketAs(agent, { title: 'Please export my data' });

    const exported = await agent.get('/api/me/data').expect(200);
    expect(exported.body.data.account.email).toBe('export@example.com');
    expect(exported.body.data.account.passwordHash).toBeUndefined();
    expect(exported.body.data.tickets).toHaveLength(1);

    await agent.delete('/api/me/data').send({ password: 'WrongPassword123' }).expect(401);
    await agent.delete('/api/me/data').send({ password: 'Password123' }).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});
