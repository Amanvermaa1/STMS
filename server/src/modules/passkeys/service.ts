import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { env } from '../../config/env.js';
import { passkeyCredentials, users, webauthnChallenges } from '../../db/schema.js';
import type { Database } from '../../db/index.js';
import type { AuthUser } from '../../middleware/auth.js';
import { badRequest, notFound, unauthorized } from '../../utils/errors.js';
import { issueSession, toPublicUser } from '../auth/service.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function storeChallenge(
  db: Database,
  input: { type: 'register' | 'authenticate'; userId?: string; userIdentifier?: string },
): Promise<string> {
  const challenge = randomBytes(32).toString('base64url');
  await db.insert(webauthnChallenges).values({
    id: randomUUID(),
    type: input.type,
    challenge,
    userId: input.userId ?? null,
    userIdentifier: input.userIdentifier ?? null,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  return challenge;
}

function asTransports(value: string[]): AuthenticatorTransportFuture[] | undefined {
  return value.length ? (value as AuthenticatorTransportFuture[]) : undefined;
}

export async function listPasskeys({ db }: { db: Database }, user: AuthUser) {
  return db
    .select({
      id: passkeyCredentials.id,
      label: passkeyCredentials.credentialId,
      deviceType: passkeyCredentials.deviceType,
      backedUp: passkeyCredentials.backedUp,
      createdAt: passkeyCredentials.createdAt,
    })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id))
    .orderBy(desc(passkeyCredentials.createdAt));
}

export async function beginRegistration({ db }: { db: Database }, user: AuthUser) {
  const existing = await db
    .select({ credentialId: passkeyCredentials.credentialId, transports: passkeyCredentials.transports })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName: env.webauthnRpName,
    rpID: env.webauthnRpId,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    excludeCredentials: existing.map((credential) => ({
      id: credential.credentialId,
      transports: asTransports(credential.transports),
    })),
  });

  await storeChallenge(db, { type: 'register', userId: user.id });
  return options;
}

export async function completeRegistration(
  { db }: { db: Database },
  user: AuthUser,
  response: RegistrationResponseJSON,
) {
  const [challenge] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.type, 'register'),
        eq(webauthnChallenges.userId, user.id),
        gt(webauthnChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(webauthnChallenges.createdAt))
    .limit(1);
  if (!challenge) throw badRequest('The passkey registration expired. Please try again.');
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challenge.id));

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: env.webauthnOrigins,
    expectedRPID: env.webauthnRpId,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw badRequest('That passkey could not be verified. Please try again.');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const publicKey = Buffer.from(credential.publicKey).toString('base64url');
  const transports = credential.transports ?? [];

  await db
    .insert(passkeyCredentials)
    .values({
      id: randomUUID(),
      userId: user.id,
      credentialId: credential.id,
      publicKey,
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports,
    })
    .onConflictDoUpdate({
      target: passkeyCredentials.credentialId,
      set: { publicKey, counter: credential.counter, deviceType: credentialDeviceType, backedUp: credentialBackedUp, transports },
    });

  return {
    credentialId: credential.id,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  };
}

export async function beginAuthentication({ db }: { db: Database }, email?: string) {
  let userId: string | undefined;
  let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> | undefined;

  if (email) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (user) {
      userId = user.id;
      const credentials = await db
        .select({ credentialId: passkeyCredentials.credentialId, transports: passkeyCredentials.transports })
        .from(passkeyCredentials)
        .where(eq(passkeyCredentials.userId, user.id));
      if (credentials.length > 0) {
        allowCredentials = credentials.map((credential) => ({
          id: credential.credentialId,
          transports: asTransports(credential.transports),
        }));
      }
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: env.webauthnRpId,
    allowCredentials,
    userVerification: 'preferred',
  });
  await storeChallenge(db, { type: 'authenticate', userId, userIdentifier: email });
  return options;
}

export async function completeAuthentication(
  { db }: { db: Database },
  email: string | undefined,
  response: AuthenticationResponseJSON,
  res: Parameters<typeof issueSession>[1],
) {
  const [challenge] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.type, 'authenticate'),
        gt(webauthnChallenges.expiresAt, new Date()),
        email ? eq(webauthnChallenges.userIdentifier, email) : isNull(webauthnChallenges.userIdentifier),
      ),
    )
    .orderBy(desc(webauthnChallenges.createdAt))
    .limit(1);
  if (!challenge) throw badRequest('That sign-in request expired. Please try again.');
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challenge.id));

  let credential;
  if (email) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (!user) throw unauthorized('No account found for that email address');
    [credential] = await db
      .select()
      .from(passkeyCredentials)
      .where(and(eq(passkeyCredentials.userId, user.id), eq(passkeyCredentials.credentialId, response.id)));
  } else {
    [credential] = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, response.id));
  }
  if (!credential) throw unauthorized('That passkey is not registered for this account');

  const [user] = await db.select().from(users).where(eq(users.id, credential.userId));
  if (!user) throw unauthorized('Account no longer exists');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: env.webauthnOrigins,
    expectedRPID: env.webauthnRpId,
    credential: {
      id: credential.credentialId,
      publicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter,
      transports: asTransports(credential.transports),
    },
    requireUserVerification: false,
  });
  if (!verification.verified) throw unauthorized('Passkey verification failed');

  await db
    .update(passkeyCredentials)
    .set({
      counter: verification.authenticationInfo.newCounter,
      deviceType: verification.authenticationInfo.credentialDeviceType,
      backedUp: verification.authenticationInfo.credentialBackedUp,
    })
    .where(eq(passkeyCredentials.id, credential.id));

  const publicUser = toPublicUser(user);
  await issueSession(db, res, publicUser);
  return publicUser;
}

export async function removePasskey({ db }: { db: Database }, user: AuthUser, credentialId: string): Promise<void> {
  const deleted = await db
    .delete(passkeyCredentials)
    .where(and(eq(passkeyCredentials.id, credentialId), eq(passkeyCredentials.userId, user.id)))
    .returning({ id: passkeyCredentials.id });
  if (deleted.length === 0) throw notFound('Passkey not found');
}
