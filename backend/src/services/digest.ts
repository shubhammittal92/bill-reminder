/**
 * Reminder digest builder.
 *
 * The differentiator of this app is NOT "email you 3 days before" — every
 * platform already does that. It is a single CONSOLIDATED digest across all
 * of your subscriptions, with spend totals, including the ones no platform
 * reminds you about (rent, insurance, domains). This module turns a list of
 * due reminders into that digest. Pure logic — no I/O — so it is testable.
 */

import { Subscription } from './reminder';
import { DueReminder } from './reminder';

export interface Digest {
  count: number;
  /** Sum of the amounts of the subscriptions renewing in this window. */
  upcomingTotal: number;
  /** Estimated total monthly subscription spend across all active subs. */
  monthlyTotal: number;
  currency: string;
  lines: string[];
  subject: string;
  text: string;
}

const PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

function money(n: number, currency: string): string {
  const rounded = Math.round(n * 100) / 100;
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${rounded.toLocaleString('en-IN')}`;
}

/**
 * Build a consolidated digest from the due reminders and the full active list
 * (needed for the monthly-spend figure).
 */
export function buildDigest(due: DueReminder[], allActive: Subscription[]): Digest {
  const currency = due[0]?.subscription.currency || allActive[0]?.currency || 'INR';

  const upcomingTotal = due.reduce((sum, r) => sum + r.subscription.amount, 0);
  const monthlyTotal = allActive.reduce(
    (sum, s) => sum + s.amount * (PER_MONTH[s.cycle] ?? 1),
    0
  );

  const lines = due.map((r) => {
    const when = r.daysUntil === 0 ? 'today' : `in ${r.daysUntil}d`;
    return `${r.subscription.name} — ${money(r.subscription.amount, r.subscription.currency)} (${when}, ${r.renewalDate})`;
  });

  const subject =
    due.length === 0
      ? 'No upcoming renewals'
      : `${due.length} renewal${due.length > 1 ? 's' : ''} coming up — ${money(upcomingTotal, currency)} due soon`;

  const text = [
    'Upcoming renewals:',
    ...lines.map((l) => `  • ${l}`),
    '',
    `Total due soon:            ${money(upcomingTotal, currency)}`,
    `Estimated monthly spend:   ${money(monthlyTotal, currency)}`,
    '',
    'This digest covers every subscription you track — including the ones',
    'no platform reminds you about (rent, insurance, domains).',
  ].join('\n');

  return {
    count: due.length,
    upcomingTotal: Math.round(upcomingTotal * 100) / 100,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    currency,
    lines,
    subject,
    text,
  };
}
