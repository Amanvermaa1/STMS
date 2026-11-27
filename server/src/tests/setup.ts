import { afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { client, db } from './db.js';

beforeEach(async () => {
  await db.execute(
    sql`truncate table activity_logs, notifications, comments, refresh_tokens, webauthn_challenges, passkey_credentials, analytics_events, user_preferences, tickets, users restart identity cascade`,
  );
});

afterAll(async () => {
  await client.close();
});
