import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export type AccessPayload = { sub: string; role: 'user' | 'admin'; email: string; name: string };

export function signAccessToken(user: AccessPayload): string {
  return jwt.sign({ role: user.role, email: user.email, name: user.name }, env.accessSecret, {
    subject: user.sub,
    expiresIn: env.accessTtl as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.accessSecret) as jwt.JwtPayload;
  if (!decoded.sub || (decoded.role !== 'user' && decoded.role !== 'admin')) {
    throw new Error('Invalid token payload');
  }
  return {
    sub: decoded.sub,
    role: decoded.role,
    email: String(decoded.email ?? ''),
    name: String(decoded.name ?? ''),
  };
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
