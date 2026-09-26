import {
  Subscription,
  nextRenewalDate,
  daysUntilRenewal,
  isReminderDue,
  dueReminders,
} from '../src/services/reminder';

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

describe('nextRenewalDate', () => {
  it('rolls a monthly subscription forward to the next future date', () => {
    const now = new Date('2026-03-20T10:00:00Z');
    const next = nextRenewalDate(sub({ startDate: '2026-01-15' }), now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-04-15');
  });

  it('returns the start date itself when it is today', () => {
    const now = new Date('2026-01-15T23:59:00Z');
    const next = nextRenewalDate(sub({ startDate: '2026-01-15' }), now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('handles yearly cycles', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const next = nextRenewalDate(sub({ startDate: '2024-02-29', cycle: 'yearly' }), now);
    // 2024-02-29 + years lands in 2027 (Feb 28/Mar depending on JS rollover)
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('daysUntilRenewal', () => {
  it('computes whole days until the next renewal', () => {
    const now = new Date('2026-04-12T00:00:00Z');
    expect(daysUntilRenewal(sub({ startDate: '2026-01-15' }), now)).toBe(3);
  });

  it('is 0 on the renewal day', () => {
    const now = new Date('2026-04-15T12:00:00Z');
    expect(daysUntilRenewal(sub({ startDate: '2026-01-15' }), now)).toBe(0);
  });
});

describe('isReminderDue', () => {
  it('is true inside the reminder window', () => {
    const now = new Date('2026-04-13T00:00:00Z'); // 2 days before 04-15
    expect(isReminderDue(sub({ startDate: '2026-01-15', reminderDays: 3 }), now)).toBe(true);
  });

  it('is false outside the reminder window', () => {
    const now = new Date('2026-04-01T00:00:00Z'); // 14 days before
    expect(isReminderDue(sub({ startDate: '2026-01-15', reminderDays: 3 }), now)).toBe(false);
  });

  it('is false for inactive subscriptions', () => {
    const now = new Date('2026-04-14T00:00:00Z');
    expect(isReminderDue(sub({ startDate: '2026-01-15', active: false }), now)).toBe(false);
  });
});

describe('dueReminders', () => {
  it('returns only due reminders, sorted by soonest', () => {
    const now = new Date('2026-04-13T00:00:00Z');
    const list = [
      sub({ name: 'Netflix', startDate: '2026-01-15', reminderDays: 3 }), // due in 2
      sub({ name: 'Rent', startDate: '2026-01-14', reminderDays: 3 }), // due in 1
      sub({ name: 'Gym', startDate: '2026-01-01', reminderDays: 1 }), // not due
    ];
    const result = dueReminders(list, now);
    expect(result.map((r) => r.subscription.name)).toEqual(['Rent', 'Netflix']);
  });
});
