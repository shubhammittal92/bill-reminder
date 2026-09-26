/**
 * Core reminder engine.
 *
 * Pure, dependency-free date logic so it is trivially unit-testable and
 * independent of the database or HTTP layer. Given a subscription's billing
 * cycle and last billed date, it computes the next renewal date and whether a
 * reminder is due within a lookahead window.
 */

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Subscription {
  id?: number;
  name: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  /** ISO date (YYYY-MM-DD) of the most recent billing, or the first billing. */
  startDate: string;
  /** How many days before renewal the user wants to be reminded. */
  reminderDays: number;
  active: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Add one billing cycle to a date, handling month/year rollover safely. */
function addCycle(date: Date, cycle: BillingCycle): Date {
  const d = new Date(date.getTime());
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default: {
      // Exhaustiveness guard: if a new cycle is added, TypeScript flags this.
      const _never: never = cycle;
      throw new Error(`Unknown billing cycle: ${_never}`);
    }
  }
  return d;
}

/** Normalize a Date to midnight UTC so day math is not skewed by time-of-day. */
function atMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Compute the next renewal date at or after `now`, rolling the start date
 * forward by whole billing cycles.
 */
export function nextRenewalDate(sub: Subscription, now: Date = new Date()): Date {
  const today = atMidnight(now);
  let next = atMidnight(new Date(sub.startDate));

  // Guard against pathological input (e.g. weekly cycle far in the past)
  // by capping iterations rather than looping unbounded.
  let guard = 0;
  while (next.getTime() < today.getTime() && guard < 10_000) {
    next = atMidnight(addCycle(next, sub.cycle));
    guard += 1;
  }
  return next;
}

/** Whole days from `now` until the next renewal (0 = due today). */
export function daysUntilRenewal(sub: Subscription, now: Date = new Date()): number {
  const next = nextRenewalDate(sub, now);
  const today = atMidnight(now);
  return Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * A reminder is due when the subscription is active and the next renewal
 * falls within the user's reminder window (0..reminderDays inclusive).
 */
export function isReminderDue(sub: Subscription, now: Date = new Date()): boolean {
  if (!sub.active) return false;
  const days = daysUntilRenewal(sub, now);
  return days >= 0 && days <= sub.reminderDays;
}

export interface DueReminder {
  subscription: Subscription;
  renewalDate: string;
  daysUntil: number;
}

/** Filter a list of subscriptions down to those with a reminder due. */
export function dueReminders(subs: Subscription[], now: Date = new Date()): DueReminder[] {
  return subs
    .filter((s) => isReminderDue(s, now))
    .map((s) => ({
      subscription: s,
      renewalDate: nextRenewalDate(s, now).toISOString().slice(0, 10),
      daysUntil: daysUntilRenewal(s, now),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
