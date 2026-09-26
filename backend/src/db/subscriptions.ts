import { db } from '../db';
import { Subscription, BillingCycle } from '../services/reminder';

const VALID_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export class ValidationError extends Error {}

/** Validate and normalize an incoming subscription payload. */
export function validate(body: Partial<Subscription>): Omit<Subscription, 'id'> {
  const name = (body.name ?? '').toString().trim();
  if (!name) throw new ValidationError('name is required');

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError('amount must be a non-negative number');
  }

  const cycle = (body.cycle ?? 'monthly') as BillingCycle;
  if (!VALID_CYCLES.includes(cycle)) {
    throw new ValidationError(`cycle must be one of ${VALID_CYCLES.join(', ')}`);
  }

  const startDate = (body.startDate ?? '').toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    throw new ValidationError('startDate must be a valid YYYY-MM-DD date');
  }

  const reminderDays = body.reminderDays === undefined ? 3 : Number(body.reminderDays);
  if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 60) {
    throw new ValidationError('reminderDays must be an integer between 0 and 60');
  }

  return {
    name,
    amount,
    currency: (body.currency ?? 'INR').toString().slice(0, 8),
    cycle,
    startDate,
    reminderDays,
    active: body.active === undefined ? true : Boolean(body.active),
  };
}

export async function listAll(userId: number): Promise<Subscription[]> {
  const rows = await db('subscriptions').where({ userId }).select('*').orderBy('createdAt', 'desc');
  return rows.map(rowToSub);
}

export async function getById(userId: number, id: number): Promise<Subscription | undefined> {
  const row = await db('subscriptions').where({ id, userId }).first();
  return row ? rowToSub(row) : undefined;
}

export async function create(userId: number, sub: Omit<Subscription, 'id'>): Promise<Subscription> {
  const [id] = await db('subscriptions').insert({ ...sub, userId });
  return (await getById(userId, id))!;
}

export async function update(
  userId: number,
  id: number,
  sub: Omit<Subscription, 'id'>
): Promise<Subscription | undefined> {
  const count = await db('subscriptions').where({ id, userId }).update(sub);
  if (count === 0) return undefined;
  return getById(userId, id);
}

export async function remove(userId: number, id: number): Promise<boolean> {
  const count = await db('subscriptions').where({ id, userId }).del();
  return count > 0;
}

/** All active subscriptions across all users, for the reminder scan. */
export async function listAllActiveWithUser(): Promise<Array<Subscription & { userId: number; userEmail: string }>> {
  const rows = await db('subscriptions')
    .join('users', 'subscriptions.userId', 'users.id')
    .where('subscriptions.active', true)
    .select('subscriptions.*', 'users.email as userEmail');
  return rows.map((r) => ({ ...rowToSub(r), userId: r.userId, userEmail: r.userEmail }));
}

function rowToSub(row: any): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    cycle: row.cycle,
    startDate: row.startDate,
    reminderDays: row.reminderDays,
    active: Boolean(row.active),
  };
}
