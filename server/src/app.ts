import express, { type ErrorRequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { demoIdentity, type IdentityResolver } from './identity.js';
import { HttpError } from './policy.js';
import { userPermissions } from './authorization.js';
import { submit } from './submission.js';
import { purchaseFields, approvalInput, revisionInput, submissionInput, requestQuery, requestId } from './validation.js';
import { decide, edit, resubmit } from './workflow.js';
import { getRequest, listRequests, presentRequest } from './requests.js';
export function createApp(db: PrismaClient, resolveIdentity: IdentityResolver = demoIdentity) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/demo-users', (_req, res, next) => {
    db.user.findMany({ orderBy: { id: 'asc' } }).then(users => res.json(users.map(user => ({ ...user, permissions: userPermissions(user) })))).catch(next);
  });
  app.post('/api/requests', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      const input = purchaseFields.parse(req.body);
      const result = await submit(db, actor, input);
      res.status(201).location(`/api/requests/${result.id}`).json(presentRequest(actor, result));
    })().catch(next);
  });
  app.get('/api/requests', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      res.json(await listRequests(db, actor, requestQuery.parse(req.query)));
    })().catch(next);
  });
  app.get('/api/requests/:id', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      res.json(await getRequest(db, actor, requestId.parse(req.params.id)));
    })().catch(next);
  });
  app.post('/api/requests/:id/approvals', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      res.status(201).json(presentRequest(actor, await decide(db, actor, requestId.parse(req.params.id), approvalInput.parse(req.body))));
    })().catch(next);
  });
  app.patch('/api/requests/:id', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      res.json(presentRequest(actor, await edit(db, actor, requestId.parse(req.params.id), revisionInput.parse(req.body))));
    })().catch(next);
  });
  app.post('/api/requests/:id/submissions', (req, res, next) => {
    (async () => {
      const actor = await resolveIdentity(db, req);
      res.status(201).json(presentRequest(actor, await resubmit(db, actor, requestId.parse(req.params.id), submissionInput.parse(req.body))));
    })().catch(next);
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid request', issues: error.issues }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
    if (error?.type === 'entity.too.large') { res.status(413).json({ error: 'Request body too large' }); return; }
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errors);
  return app;
}
