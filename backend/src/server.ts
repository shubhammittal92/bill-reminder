import { createApp } from './app';
import { initDb } from './db';
import * as repo from './db/subscriptions';
import { dueReminders } from './services/reminder';

const PORT = Number(process.env.PORT || 4000);

/**
 * A reminder scan. In production this would send email/push; here it logs the
 * due reminders. Runs on boot and then daily. This is the "notifications" hook.
 */
async function scanAndNotify(): Promise<void> {
  const subs = await repo.listAll();
  const due = dueReminders(subs);
  if (due.length === 0) return;
  // eslint-disable-next-line no-console
  console.log(`[reminder-scan] ${due.length} reminder(s) due:`);
  for (const r of due) {
    // eslint-disable-next-line no-console
    console.log(`  - ${r.subscription.name}: renews ${r.renewalDate} (in ${r.daysUntil} day(s))`);
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
