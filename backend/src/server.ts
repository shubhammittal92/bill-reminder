import { createApp } from './app';
import { initDb } from './db';
import * as repo from './db/subscriptions';
import { dueReminders } from './services/reminder';
import { buildDigest } from './services/digest';
import { sendDigestEmail } from './services/email';

const PORT = Number(process.env.PORT || 4000);

/**
 * Daily reminder scan: builds ONE consolidated digest across all due
 * subscriptions (with spend totals) and emails it. Falls back to logging if
 * email is not configured. This is the app's core value — a single digest,
 * not a per-platform ping.
 */
export async function scanAndNotify(): Promise<void> {
  const subs = await repo.listAll();
  const due = dueReminders(subs);
  const activeSubs = subs.filter((s) => s.active);
  const digest = buildDigest(due, activeSubs);

  if (due.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[reminder-scan] nothing due');
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[reminder-scan] ${digest.subject}`);
  await sendDigestEmail(digest);
}

async function main(): Promise<void> {
  await initDb();
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`bill-reminder API listening on http://localhost:${PORT}`);
  });

  await scanAndNotify();
  setInterval(scanAndNotify, 24 * 60 * 60 * 1000);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err);
  process.exit(1);
});
