import { Subscription, dueReminders } from '../src/services/reminder';
import { buildDigest } from '../src/services/digest';

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    name: 'Test',
    amount: 100,
    currency: 'INR',
    cycle: 'monthly',
    startDate: '2026-01-15',
    reminderDays: 3,
    active: true,
    ...overrides,
  };
}

describe('buildDigest', () => {
  const now = new Date('2026-04-13T00:00:00Z');

  it('consolidates due reminders with an upcoming total', () => {
    const all = [
      sub({ name: 'Netflix', amount: 649, startDate: '2026-01-15', reminderDays: 3 }), // due in 2
      sub({ name: 'Rent', amount: 18000, startDate: '2026-01-14', reminderDays: 3 }), // due in 1
      sub({ name: 'Gym', amount: 1000, startDate: '2026-01-01', reminderDays: 1 }), // not due
    ];
    const due = dueReminders(all, now);
    const digest = buildDigest(due, all);

    expect(digest.count).toBe(2);
    expect(digest.upcomingTotal).toBe(18649); // 18000 + 649
    expect(digest.subject).toContain('2 renewals');
    expect(digest.text).toContain('Rent');
    expect(digest.text).toContain('Netflix');
  });

  it('computes estimated monthly spend across mixed cycles', () => {
    const all = [
      sub({ name: 'Monthly', amount: 500, cycle: 'monthly' }),
      sub({ name: 'Yearly', amount: 12000, cycle: 'yearly' }), // 1000/mo
    ];
    const due = dueReminders(all, now);
    const digest = buildDigest(due, all);
    expect(digest.monthlyTotal).toBe(1500); // 500 + 1000
  });

  it('produces a no-renewals subject when nothing is due', () => {
    const digest = buildDigest([], []);
    expect(digest.count).toBe(0);
    expect(digest.subject).toBe('No upcoming renewals');
  });
});
