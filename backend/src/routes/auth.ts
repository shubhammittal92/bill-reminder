import { Router, Request, Response, NextFunction } from 'express';
import * as users from '../db/users';
import { AuthError } from '../db/users';
import { verifyPassword, signToken } from '../services/auth';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const authRouter = Router();

authRouter.post(
  '/signup',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = users.validateCredentials(req.body.email, req.body.password);
      const user = await users.createUser(email, password);
      const token = signToken(user.id, user.email);
      res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      if (err instanceof AuthError) return res.status(400).json({ error: err.message });
      return next(err);
    }
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = users.validateCredentials(req.body.email, req.body.password);
      const user = await users.findByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'invalid email or password' });
      }
      const token = signToken(user.id, user.email);
      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      if (err instanceof AuthError) return res.status(400).json({ error: err.message });
      return next(err);
    }
  })
);

authRouter.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ id: req.userId, email: req.userEmail });
});
