import { loadEnv } from './config/env';
loadEnv();

import { createApp } from './app';
import { initDb } from './db';
import * as repo from './db/subscriptions';
import { dueReminders } from './services/reminder';
import { buildDigest } from './services/digest';
import { sendDigestEmail } from './services/email';

const PORT = Number(process.env.PORT || 4000);

/**
 * Daily reminder scan. Groups all active subscriptions by user, builds ONE
 * consolidated digest per user (with spend totals), and emails it to that
 * user. Falls back to logging when email is unconfigured.
 */
export async function scanAndNotify(): Promise<void> {
  const rows = await repo.listAllActiveWithUser();
  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[reminder-scan] no active subscriptions');
    return;
  }

  // Group by user.
  const byUser = new Map<number, { email: string; subs: typeof rows }>();
  for (const row of rows) {
    const entry = byUser.get(row.userId) || { email: row.userEmail, subs: [] as typeof rows };
    entry.subs.push(row);
    byUser.set(row.userId, entry);
  }

  for (const { email, subs } of byUser.values()) {
    const due = dueReminders(subs);
    if (due.length === 0) continue;
    const digest = buildDigest(due, subs);
    // eslint-disable-next-line no-console
    console.log(`[reminder-scan] ${email}: ${digest.subject}`);
    await sendDigestEmail(digest, email);
  }
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
