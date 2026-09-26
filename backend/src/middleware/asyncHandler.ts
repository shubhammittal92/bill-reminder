import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async Express handler so a rejected promise is forwarded to the
 * centralized error handler via next(err), instead of becoming an unhandled
 * promise rejection that crashes the Node process.
 *
 * Express 4 does not catch throws from async handlers on its own — without this
 * wrapper, one failed DB call (or any await that rejects) takes the whole
 * server down.
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
