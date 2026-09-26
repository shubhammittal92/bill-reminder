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
  const [id] = await db('users').insert({ email: email.toLowerCase(), passwordHash });
  return { id, email: email.toLowerCase(), passwordHash };
}
