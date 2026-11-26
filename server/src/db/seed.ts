import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { db, pool } from './index.js';
import { users } from './schema.js';

async function main() {
  const passwordHash = await hashPassword(env.adminPassword);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, env.adminEmail));

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ role: 'admin', name: env.adminName, updatedAt: new Date() })
      .where(eq(users.email, env.adminEmail));
    console.log(`✓ Admin role ensured for ${env.adminEmail}`);
    return;
  }

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: env.adminName,
    email: env.adminEmail,
    passwordHash,
    role: 'admin',
  });
  console.log(`✓ Admin created: ${env.adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
