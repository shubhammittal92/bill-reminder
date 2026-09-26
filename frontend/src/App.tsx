import { useEffect, useState, FormEvent } from 'react';
import {
  Subscription,
  Summary,
  listSubscriptions,
  createSubscription,
  deleteSubscription,
  getSummary,
} from './api';

const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export default function App() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reminderDays, setReminderDays] = useState('3');

  async function refresh() {
    try {
      const [s, sum] = await Promise.all([listSubscriptions(), getSummary()]);
      setSubs(s);
      setSummary(sum);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createSubscription({
        name,
        amount: Number(amount),
        currency: 'INR',
        cycle,
        startDate,
        reminderDays: Number(reminderDays),
      });
      setName('');
      setAmount('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete(id: number) {
    await deleteSubscription(id);
    await refresh();
  }

  return (
    <div className="container">
      <h1>Bill &amp; Subscription Reminder</h1>
      <p className="subtitle">Never miss a renewal again.</p>

      {summary && (
        <div className="summary">
          <span>{summary.activeCount} active</span>
          <span>~₹{summary.estimatedMonthlySpend.toLocaleString('en-IN')}/mo estimated</span>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <form className="add-form" onSubmit={onSubmit}>
        <input placeholder="Name (e.g. Netflix)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
        <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
          {CYCLES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <input type="number" title="Remind me this many days before" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} min="0" max="60" />
        <button type="submit">Add</button>
      </form>

      <ul className="list">
        {subs.length === 0 && <li className="empty">No subscriptions yet. Add one above.</li>}
        {subs.map((s) => {
          const soon = s.active && s.daysUntil <= s.reminderDays;
          return (
            <li key={s.id} className={soon ? 'row due' : 'row'}>
              <div className="info">
                <strong>{s.name}</strong>
                <span className="meta">
                  ₹{s.amount} · {s.cycle} · renews {s.nextRenewal}
                  {soon && <span className="badge">due in {s.daysUntil}d</span>}
                </span>
              </div>
              <button className="del" onClick={() => onDelete(s.id)}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
