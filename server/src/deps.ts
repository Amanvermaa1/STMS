import type { Database } from './db/index.js';
import type { EventBus } from './events/eventBus.js';
import type { Mailer } from './services/mailer.js';

export interface Dependencies {
  db: Database;
  eventBus: EventBus;
  mailer: Mailer;
}
