export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  reminderDays: number;
  active: boolean;
  nextRenewal: string;
  daysUntil: number;
}

export interface NewSubscription {
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  startDate: string;
  reminderDays: number;
}

export interface Summary {
  activeCount: number;
  estimatedMonthlySpend: number;
}

const base = '/api';

export async function listSubscriptions(): Promise<Subscription[]> {
  const res = await fetch(`${base}/subscriptions`);
  if (!res.ok) throw new Error('failed to load subscriptions');
  return res.json();
}

export async function createSubscription(sub: NewSubscription): Promise<Subscription> {
  const res = await fetch(`${base}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'failed to create subscription');
  }
  return res.json();
}

export async function deleteSubscription(id: number): Promise<void> {
  const res = await fetch(`${base}/subscriptions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('failed to delete subscription');
}

export async function getSummary(): Promise<Summary> {
  const res = await fetch(`${base}/summary`);
  if (!res.ok) throw new Error('failed to load summary');
  return res.json();
}
