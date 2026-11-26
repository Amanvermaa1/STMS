import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { db, pool } from './index.js';

async function main() {
  await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  console.log('✓ Database migrations applied');
}

main()
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
