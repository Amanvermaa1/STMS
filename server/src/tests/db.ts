import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { resolve } from 'node:path';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema.js';

export const client = new PGlite();
const pgliteDb = drizzle(client, { schema });

await migrate(pgliteDb, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

// Runtime APIs are compatible; the cast lets services keep one Database type.
export const db = pgliteDb as unknown as Database;
