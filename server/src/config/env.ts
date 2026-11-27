import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Support both server/.env and repo-root .env.
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '..', '.env') });

function str(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function int(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function list(name: string, fallback: string): string[] {
  return str(name, fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_DATABASE_URL = 'postgresql://stms:stms@localhost:5432/stms';

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: int('PORT', 4000),
  databaseUrl: str('DATABASE_URL', DEFAULT_DATABASE_URL),
  migrationDatabaseUrl: str('DATABASE_MIGRATION_URL', str('DATABASE_URL', DEFAULT_DATABASE_URL)),
  jwtSecret: str('JWT_SECRET', 'dev-only-change-me'),
  accessSecret: str('JWT_ACCESS_SECRET', process.env.JWT_SECRET?.trim() || 'dev-only-access-secret'),
  refreshSecret: str('JWT_REFRESH_SECRET', process.env.JWT_SECRET?.trim() || 'dev-only-refresh-secret'),
  accessTtl: str('ACCESS_TOKEN_TTL', '15m'),
  refreshTtlDays: int('REFRESH_TOKEN_TTL_DAYS', 7),
  corsOrigin: str('CORS_ORIGIN', 'http://localhost:5173'),
  adminEmail: str('ADMIN_EMAIL', 'admin@stms.local'),
  adminPassword: str('ADMIN_PASSWORD', 'Admin@12345'),
  adminName: str('ADMIN_NAME', 'Helpdesk Admin'),
  smtpHost: str('SMTP_HOST', ''),
  smtpPort: int('SMTP_PORT', 587),
  smtpUser: str('SMTP_USER', ''),
  smtpPassword: str('SMTP_PASSWORD', ''),
  smtpFrom: str('SMTP_FROM', 'Helpdesk <no-reply@stms.local>'),
  webauthnRpId: str('WEBAUTHN_RP_ID', 'localhost'),
  webauthnRpName: str('WEBAUTHN_RP_NAME', 'STMS Helpdesk'),
  webauthnOrigins: list('WEBAUTHN_ORIGINS', 'http://localhost:5173,http://localhost:8080'),
} as const;

export const isProduction = env.nodeEnv === 'production';

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    path: '/',
  };
}
