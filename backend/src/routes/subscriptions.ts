import { Router, Response, NextFunction } from 'express';
import * as repo from '../db/subscriptions';
import { ValidationError } from '../db/subscriptions';
import { dueReminders, daysUntilRenewal, nextRenewalDate } from '../services/reminder';
import { buildDigest } from '../services/digest';
import { sendDigestEmail } from '../services/email';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const router = Router();

// Every route below requires authentication and is scoped to the caller.
router.use(requireAuth);

/** List the caller's subscriptions, annotated with computed renewal info. */
router.get(
  '/subscriptions',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const subs = await repo.listAll(req.userId!);
    const annotated = subs.map((s) => ({
      ...s,
      nextRenewal: nextRenewalDate(s).toISOString().slice(0, 10),
      daysUntil: daysUntilRenewal(s),
    }));
    res.json(annotated);
  })
);

router.post(
  '/subscriptions',
  asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const clean = repo.validate(req.body);
      const created = await repo.create(req.userId!, clean);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      return next(err);
    }
  })
);

router.put(
  '/subscriptions/:id',
  asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    try {
      const clean = repo.validate(req.body);
      const updated = await repo.update(req.userId!, id, clean);
      if (!updated) return res.status(404).json({ error: 'not found' });
      res.json(updated);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      return next(err);
    }
  })
);

router.delete(
  '/subscriptions/:id',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const ok = await repo.remove(req.userId!, Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  })
);

/** Reminders due within each subscription's own reminder window. */
router.get(
  '/reminders',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const subs = await repo.listAll(req.userId!);
    res.json(dueReminders(subs));
  })
);

/** Monthly spend summary across the caller's active subscriptions. */
router.get(
  '/summary',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const subs = (await repo.listAll(req.userId!)).filter((s) => s.active);
    const perMonth: Record<string, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
    const monthlyTotal = subs.reduce((sum, s) => sum + s.amount * (perMonth[s.cycle] ?? 1), 0);
    res.json({
      activeCount: subs.length,
      estimatedMonthlySpend: Math.round(monthlyTotal * 100) / 100,
    });
  })
);

/** Preview the caller's consolidated reminder digest. */
router.get(
  '/digest',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const subs = await repo.listAll(req.userId!);
    const due = dueReminders(subs);
    const digest = buildDigest(due, subs.filter((s) => s.active));
    res.json(digest);
  })
);

/** Send the caller's digest email now (recipient = the logged-in user). */
router.post(
  '/digest/send',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const subs = await repo.listAll(req.userId!);
    const due = dueReminders(subs);
    const digest = buildDigest(due, subs.filter((s) => s.active));
    const result = await sendDigestEmail(digest, req.userEmail);
    res.json({ digest, result });
  })
);
