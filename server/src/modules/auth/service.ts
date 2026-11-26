import type { Request, Response } from 'express';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { cookieOptions, env } from '../../config/env.js';
import type { Database } from '../../db/index.js';
import { refreshTokens, users, type UserRow } from '../../db/schema.js';
import { conflict, unauthorized } from '../../utils/errors.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  type AccessPayload,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../../utils/token.js';

export type PublicUser = Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function registerUser(
  db: Database,
  input: { name: string; email: string; password: string },
): Promise<PublicUser> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (existing.length > 0) throw conflict('An account with this email already exists');

  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'user', // Registration can never self-assign admin.
    })
    .returning();

  return toPublicUser(user);
}

export async function authenticateUser(
  db: Database,
  email: string,
  password: string,
): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }
  return toPublicUser(user);
}

export async function issueSession(db: Database, res: Response, user: PublicUser): Promise<void> {
  const payload: AccessPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
  const refreshToken = generateRefreshToken();

  await db.insert(refreshTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000),
  });

  res.cookie('access_token', signAccessToken(payload), cookieOptions(15 * 60 * 1000));
  res.cookie(
    'refresh_token',
    refreshToken,
    cookieOptions(env.refreshTtlDays * 24 * 60 * 60 * 1000),
  );
}

export async function refreshSession(db: Database, req: Request, res: Response): Promise<PublicUser> {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) throw unauthorized('Refresh token missing');

  const tokenHash = hashRefreshToken(token);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())),
    );

  if (!stored) throw unauthorized('Refresh token is invalid or expired');

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, stored.id));

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId));
  if (!user) throw unauthorized('Account no longer exists');

  await issueSession(db, res, toPublicUser(user));
  return toPublicUser(user);
}

export async function logoutSession(db: Database, req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token as string | undefined;
  if (token) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(token)));
  }
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

export function userFromAccessToken(token: string): PublicUser {
  const payload = verifyAccessToken(token);
  return {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
    name: payload.name,
    createdAt: new Date(0),
  };
}
