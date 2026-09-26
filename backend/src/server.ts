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
  // Bind 0.0.0.0 so hosted platforms (Render, etc.) can route to the service;
  // binding the default loopback would make the platform health check fail.
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`bill-reminder API listening on port ${PORT}`);
  });

  // The reminder scan is a background job. It must NEVER take the web server
  // down: a scan failure (transient DB error, email backend hiccup) should be
  // logged and retried on the next tick, not crash the process. So we do NOT
  // await it here, and we swallow its rejection.
  const runScan = (): void => {
    scanAndNotify().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[reminder-scan] failed (non-fatal):', err);
    });
  };
  runScan();
  setInterval(runScan, 24 * 60 * 60 * 1000);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err);
  process.exit(1);
});
