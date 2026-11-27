import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp, registerUser } from './helpers.js';

describe('passkeys', () => {
  it('issues registration options for a signed-in user and rejects invalid verification', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'passkey-register@example.com');

    const list = await agent.get('/api/passkeys').expect(200);
    expect(list.body.passkeys).toEqual([]);

    const options = await agent.post('/api/passkeys/register/options').expect(200);
    expect(options.body.challenge).toBeTruthy();
    expect(options.body.rp.id).toBe('localhost');
    expect(options.body.user.name).toBe('passkey-register@example.com');

    await agent.post('/api/passkeys/register/verify').send({ id: 'not-a-real-response' }).expect(400);
  });

  it('issues authentication options publicly and protects management routes', async () => {
    const agent = request.agent(makeApp());
    await registerUser(agent, 'passkey-auth@example.com');

    const options = await request(makeApp())
      .post('/api/passkeys/authenticate/options')
      .send({ email: 'passkey-auth@example.com' })
      .expect(200);
    expect(options.body.challenge).toBeTruthy();
    expect(options.body.allowCredentials).toBeUndefined();

    await request(makeApp()).get('/api/passkeys').expect(401);
    await request(makeApp())
      .post('/api/passkeys/authenticate/verify')
      .send({ email: 'passkey-auth@example.com', response: { id: 'bad' } })
      .expect(400);
  });
});
