import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const categoryEnum = pgEnum('ticket_category', [
  'general',
  'billing',
  'technical',
  'account',
  'feature_request',
]);
export const priorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);
export const statusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash_unique').on(table.tokenHash),
    index('refresh_tokens_user_idx').on(table.userId),
  ],
);

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    category: categoryEnum('category').notNull().default('general'),
    priority: priorityEnum('priority').notNull().default('medium'),
    status: statusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tickets_author_idx').on(table.authorId),
    index('tickets_status_priority_idx').on(table.status, table.priority),
    index('tickets_created_at_idx').on(table.createdAt),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('comments_ticket_idx').on(table.ticketId)],
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 20 }).notNull(),
    eventType: varchar('event_type', { length: 60 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('activity_logs_ticket_idx').on(table.ticketId)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 60 }).notNull(),
    message: text('message').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_recipient_idx').on(table.recipientId, table.readAt)],
);

export interface TicketListPreferences {
  search?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
}

export interface PrivacyPreferences {
  analyticsOptIn?: boolean;
  productUpdatesOptIn?: boolean;
}

export interface UserPreferenceValues {
  dashboard?: { widgets?: string[] };
  tickets?: TicketListPreferences;
  privacy?: PrivacyPreferences;
}

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  values: jsonb('values').$type<UserPreferenceValues>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 80 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('analytics_events_user_idx').on(table.userId),
    index('analytics_events_type_created_idx').on(table.type, table.createdAt),
  ],
);

export const passkeyCredentials = pgTable(
  'passkey_credentials',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: varchar('credential_id', { length: 255 }).notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    deviceType: varchar('device_type', { length: 20 }).notNull().default('single_device'),
    backedUp: boolean('backed_up').notNull().default(false),
    transports: jsonb('transports').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('passkey_credentials_credential_id_unique').on(table.credentialId),
    index('passkey_credentials_user_idx').on(table.userId),
  ],
);

export const webauthnChallenges = pgTable(
  'webauthn_challenges',
  {
    id: uuid('id').primaryKey(),
    type: varchar('type', { length: 20 }).notNull(),
    challenge: varchar('challenge', { length: 255 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    userIdentifier: varchar('user_identifier', { length: 254 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('webauthn_challenges_challenge_unique').on(table.challenge),
    index('webauthn_challenges_user_idx').on(table.userId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type TicketRow = typeof tickets.$inferSelect;
