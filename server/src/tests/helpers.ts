import { randomUUID } from 'node:crypto';
import request, { type SuperAgentTest } from 'supertest';
import { createApp } from '../app.js';
import { db } from './db.js';
import { users } from '../db/schema.js';
import { createEventBus } from '../events/eventBus.js';
import { createNoopMailer } from '../services/mailer.js';
import { hashPassword } from '../utils/password.js';

export function makeApp() {
  return createApp({ db, eventBus: createEventBus(), mailer: createNoopMailer() });
}

export async function registerUser(
  agent: SuperAgentTest,
  email: string,
  password = 'Password123',
) {
  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password })
    .expect(201);
  return response.body.user as { id: string; role: string };
}

export async function loginUser(email: string, password = 'Password123'): Promise<SuperAgentTest> {
  const agent = request.agent(makeApp());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
}

export async function createAdmin(email = 'admin@test.local') {
  const [admin] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: 'Admin',
      email,
      passwordHash: await hashPassword('AdminPassword123'),
      role: 'admin',
    })
    .returning();
  return admin;
}

export async function createTicketAs(
  agent: SuperAgentTest,
  overrides: Record<string, unknown> = {},
) {
  const response = await agent
    .post('/api/tickets')
    .send({
      title: 'Printer is jammed',
      description: 'The office printer jams whenever I print a PDF document.',
      category: 'technical',
      priority: 'high',
      ...overrides,
    })
    .expect(201);
  return response.body.ticket as { id: string; status: string };
}
