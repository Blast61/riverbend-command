import express, { type ErrorRequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { demoIdentity } from './identity.js';
import { HttpError } from './policy.js';
import { submit } from './submission.js';
const submission = z.object({
  vendor: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive().max(2_147_483_647),
  reason: z.string().trim().min(1).max(4000),
}).strict();
export function createApp(db: PrismaClient) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/demo-users', (_req, res, next) => {
    db.user.findMany({ orderBy: { id: 'asc' } }).then(users => res.json(users)).catch(next);
  });
  app.post('/api/requests', (req, res, next) => {
    (async () => {
      const actor = await demoIdentity(db, req);
      const input = submission.parse(req.body);
      const result = await submit(db, actor, input);
      res.status(201).location(`/api/requests/${result.id}`).json(result);
    })().catch(next);
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid submission', issues: error.issues }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errors);
  return app;
}
