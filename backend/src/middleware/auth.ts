import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

/** Express request augmented with the authenticated user id. */
export interface AuthedRequest extends Request {
  userId?: number;
  userEmail?: string;
}

/** Require a valid bearer token; sets req.userId or returns 401. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'authentication required' });
    return;
  }
  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}
