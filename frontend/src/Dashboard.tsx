import { useEffect, useState, FormEvent } from 'react';
import {
  Subscription,
  Summary,
  AuthUser,
  listSubscriptions,
  createSubscription,
  deleteSubscription,
  getSummary,
  sendDigest,
} from './api';

const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export default function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  async function onSendDigest() {
    setNotice('');
    setError('');
    try {
      const res = await sendDigest();
      if (res.result?.sent) {
        setNotice(`Digest emailed to ${user.email}.`);
      } else {
        setNotice(`Digest built (${res.digest.count} due). Email not sent: ${res.result?.reason}.`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <header className="topbar">
        <div>
          <h1>Bill &amp; Subscription Reminder</h1>
          <p className="subtitle">Never miss a renewal again.</p>
        </div>
        <div className="account">
          <span className="who">{user.email}</span>
          <button className="link" onClick={onLogout}>Log out</button>
        </div>
      </header>

      {summary && (
        <div className="summary">
          <span>{summary.activeCount} active</span>
          <span>~₹{summary.estimatedMonthlySpend.toLocaleString('en-IN')}/mo estimated</span>
          <button className="digest-btn" onClick={onSendDigest}>Email me my digest</button>
        </div>
      )}

      {notice && <div className="notice">{notice}</div>}
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
