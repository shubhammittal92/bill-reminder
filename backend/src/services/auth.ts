/**
 * Authentication primitives, built on Node's crypto so the app has no auth
 * dependency to audit.
 *
 * - Passwords are hashed with scrypt + a per-password random salt, stored as
 *   `salt:hash`. Verification is constant-time.
 * - Sessions use a compact HMAC-signed token (a minimal JWT-style token):
 *   base64url(header).base64url(payload).base64url(HMAC-SHA256). The secret
 *   comes from JWT_SECRET (a dev default is used if unset, with a warning).
 */

import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET not set — using an insecure dev default. Set it in production.');
  return 'dev-insecure-secret-change-me';
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export interface TokenPayload {
  sub: number; // user id
  email: string;
  iat: number;
  exp: number;
}

/** Sign a token valid for `ttlSeconds` (default 7 days). */
export function signToken(userId: number, email: string, ttlSeconds = 7 * 24 * 3600): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { sub: userId, email, iat: now, exp: now + ttlSeconds };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/** Verify a token and return its payload, or null if invalid/expired. */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
