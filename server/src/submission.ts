import type { PrismaClient, User } from '@prisma/client';
import { HttpError, route } from './policy.js';
export type Submission = { vendor: string; amountCents: number; reason: string };
export async function submit(db: PrismaClient, actor: User, input: Submission) {
  if (actor.role === 'FINANCE_VIEWER') throw new HttpError(403, 'Finance viewer is read-only');
  const required = route(input.amountCents);
  return db.$transaction(async tx => {
    // Follow the explicit reporting hierarchy; never silently skip a conflict.
    const assignees: User[] = [];
    let managerId = actor.managerId;
    for (const role of required) {
      const assignee = managerId ? await tx.user.findUnique({ where: { id: managerId } }) : null;
      if (!assignee || assignee.role !== role) throw new HttpError(409, `No configured ${role} in reporting chain`);
      assignees.push(assignee);
      managerId = assignee.managerId;
    }
    const now = new Date();
    const request = await tx.purchaseRequest.create({ data: {
      ...input, requesterId: actor.id, status: 'PENDING_APPROVAL', version: 1, submittedAt: now,
    } });
    for (const [ordinal, roleRequired] of required.entries()) {
      const stage = await tx.approvalStage.create({ data: {
        requestId: request.id, requestVersion: 1, ordinal: ordinal + 1, roleRequired,
        assigneeId: assignees[ordinal].id, status: ordinal === 0 ? 'PENDING' : 'WAITING',
        activatedAt: ordinal === 0 ? now : null,
      } });
      if (ordinal === 0) await tx.purchaseRequest.update({ where: { id: request.id }, data: { activeStageId: stage.id } });
    }
    await tx.auditEvent.create({ data: {
      requestId: request.id, version: 1, actorId: actor.id, action: 'SUBMITTED',
      priorState: null, nextState: 'PENDING_APPROVAL',
      details: JSON.stringify({ ...input, route: required }), occurredAt: now,
    } });
    return tx.purchaseRequest.findUniqueOrThrow({ where: { id: request.id }, include: {
      stages: { orderBy: { ordinal: 'asc' } }, events: true,
    } });
  });
}
