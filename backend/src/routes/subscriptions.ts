import { Router, Request, Response } from 'express';
import * as repo from '../db/subscriptions';
import { ValidationError } from '../db/subscriptions';
import { dueReminders, daysUntilRenewal, nextRenewalDate } from '../services/reminder';

export const router = Router();

/** List all subscriptions, annotated with computed renewal info. */
router.get('/subscriptions', async (_req: Request, res: Response) => {
  const subs = await repo.listAll();
  const annotated = subs.map((s) => ({
    ...s,
    nextRenewal: nextRenewalDate(s).toISOString().slice(0, 10),
    daysUntil: daysUntilRenewal(s),
  }));
  res.json(annotated);
});

router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const clean = repo.validate(req.body);
    const created = await repo.create(clean);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

router.put('/subscriptions/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const clean = repo.validate(req.body);
    const updated = await repo.update(id, clean);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

router.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  const ok = await repo.remove(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).send();
});

/** Reminders due within each subscription's own reminder window. */
router.get('/reminders', async (_req: Request, res: Response) => {
  const subs = await repo.listAll();
  res.json(dueReminders(subs));
});

/** Monthly spend summary across active subscriptions (normalized to monthly). */
router.get('/summary', async (_req: Request, res: Response) => {
  const subs = (await repo.listAll()).filter((s) => s.active);
  const perMonth: Record<string, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  const monthlyTotal = subs.reduce((sum, s) => sum + s.amount * (perMonth[s.cycle] ?? 1), 0);
  res.json({
    activeCount: subs.length,
    estimatedMonthlySpend: Math.round(monthlyTotal * 100) / 100,
  });
});
