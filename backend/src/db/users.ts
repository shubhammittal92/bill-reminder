import { db } from '../db';
import { hashPassword } from '../services/auth';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
}

export class AuthError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email?: string, password?: string): { email: string; password: string } {
  const e = (email ?? '').toString().trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new AuthError('a valid email is required');
  const p = (password ?? '').toString();
  if (p.length < 8) throw new AuthError('password must be at least 8 characters');
  return { email: e, password: p };
}

export async function findByEmail(email: string): Promise<User | undefined> {
  return db('users').where({ email: email.toLowerCase() }).first();
}

export async function createUser(email: string, password: string): Promise<User> {
  const existing = await findByEmail(email);
  if (existing) throw new AuthError('an account with this email already exists');
  const passwordHash = hashPassword(password);
  // Postgres does NOT return the inserted id from a plain .insert() (it returns
  // an empty array); it needs .returning('id'). SQLite returns [id] directly and
  // ignores .returning(). Handle both: prefer the returned row, fall back to a
  // lookup so the id is always populated.
  const inserted = await db('users')
    .insert({ email: email.toLowerCase(), passwordHash })
    .returning('id');
  let id = extractId(inserted);
  if (id === undefined) {
    const row = await findByEmail(email);
    id = row?.id;
  }
  if (id === undefined) throw new Error('failed to create user');
  return { id, email: email.toLowerCase(), passwordHash };
}

/** Normalize Knex insert-return shapes: [id], [{ id }], or []. */
function extractId(inserted: unknown): number | undefined {
  if (!Array.isArray(inserted) || inserted.length === 0) return undefined;
  const first = inserted[0];
  if (typeof first === 'number') return first;
  if (first && typeof first === 'object' && 'id' in first) {
    return (first as { id: number }).id;
  }
  return undefined;
}
