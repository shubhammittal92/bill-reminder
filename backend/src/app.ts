import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { router } from './routes/subscriptions';
import { authRouter } from './routes/auth';

export function createApp(): Application {
  const app = express();
  // Allow the deployed frontend origin(s). CORS_ORIGIN can be a comma-separated
  // list; defaults to permissive for local dev.
  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;
  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api', router);

  // Centralized error handler so route handlers can throw freely.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
