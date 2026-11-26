import { env } from './config/env.js';
import { createApp } from './app.js';
import { db, pool } from './db/index.js';
import { createEventBus } from './events/eventBus.js';
import { createMailer } from './services/mailer.js';

const app = createApp({ db, eventBus: createEventBus(), mailer: createMailer() });

const server = app.listen(env.port, () => {
  console.log(`✓ STMS API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
