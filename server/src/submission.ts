import type { PrismaClient, User } from '@prisma/client';
import { assertWritable } from './authorization.js';
import { detailInclude, installRoute, transaction } from './workflow-store.js';
export type Submission = { vendor: string; amountCents: number; reason: string };
export async function submit(db: PrismaClient, actor: User, input: Submission) {
  assertWritable(actor);
  return transaction(db, async tx => {
    const now = new Date();
    const request = await tx.purchaseRequest.create({ data: {
      ...input, requesterId: actor.id, status: 'PENDING_APPROVAL', version: 1, submittedAt: now,
    } });
    const required = await installRoute(tx, request.id, 1, input.amountCents, actor, now);
    await tx.purchaseRevision.create({ data: { ...input, requestId: request.id, version: 1, submittedAt: now } });
    await tx.auditEvent.create({ data: {
      requestId: request.id, version: 1, actorId: actor.id, action: 'SUBMITTED',
      priorState: null, nextState: 'PENDING_APPROVAL',
      details: JSON.stringify({ ...input, route: required }), occurredAt: now,
    } });
    return tx.purchaseRequest.findUniqueOrThrow({ where: { id: request.id }, include: detailInclude });
  });
}
