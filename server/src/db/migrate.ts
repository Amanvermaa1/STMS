import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { resolve } from 'node:path';
import { env } from '../config/env.js';
import * as schema from './schema.js';

async function main() {
  // Use a dedicated pool for migrations so hosted setups can point DATABASE_URL
  // at a transaction pooler while migrations use the session/direct connection.
  const pool = new Pool({ connectionString: env.migrationDatabaseUrl, max: 1 });
  try {
    const migrationDb = drizzle(pool, { schema });
    await migrate(migrationDb, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
    console.log('✓ Database migrations applied');
  } finally {
    await pool.end();
  }
}

main()
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  });
