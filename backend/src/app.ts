import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { router } from './routes/subscriptions';

export function createApp(): Application {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', router);

  // Centralized error handler so route handlers can throw freely.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
