import type { PrismaClient } from '@prisma/client';
import type { User, PurchaseRequest } from '@prisma/client';
import { assertApprover, assertOwner } from './authorization.js';
import { HttpError } from './policy.js';
import { approvalInput, revisionInput, submissionInput, type ApprovalInput, type RevisionInput } from './validation.js';
import { detailInclude, installRoute, transaction } from './workflow-store.js';
function requireEditable(request: PurchaseRequest, version: number) {
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(request.status) || request.version !== version) {
    throw new HttpError(409, 'Request is not editable at this version');
  }
}
function requireClaim(count: number) {
  if (count !== 1) throw new HttpError(409, 'Workflow changed; reload before retrying');
}
export async function decide(db: PrismaClient, actor: User, id: string, raw: ApprovalInput) {
  const input = approvalInput.parse(raw);
  return transaction(db, async tx => {
    const request = await tx.purchaseRequest.findUnique({ where: { id }, include: { activeStage: true } });
    if (!request) throw new HttpError(404, 'Request not found');
    const stage = request.activeStage;
    if (request.status !== 'PENDING_APPROVAL' || !stage || stage.id !== input.stageId ||
        stage.requestId !== id || stage.requestVersion !== request.version || stage.status !== 'PENDING') {
      throw new HttpError(409, 'Stage is not active for the current version');
    }
    assertApprover(actor, request, stage);
    const now = new Date();
    // Acquire the request mutation with predicates from the read snapshot.
    const claimed = await tx.purchaseRequest.updateMany({ where: {
      id, version: request.version, status: 'PENDING_APPROVAL', activeStageId: stage.id,
    }, data: { updatedAt: now } });
    requireClaim(claimed.count);
    const decided = await tx.approvalStage.updateMany({ where: {
      id: stage.id, requestId: id, requestVersion: request.version, status: 'PENDING',
    }, data: { status: input.decision === 'APPROVED' ? 'APPROVED' : 'SUPERSEDED',
      decision: input.decision, decisionComment: input.comment ?? null, decidedAt: now } });
    requireClaim(decided.count);
    let status: string = input.decision;
    let activeStageId: string | null = null;
    if (input.decision === 'APPROVED') {
      const next = await tx.approvalStage.findUnique({ where: { requestId_requestVersion_ordinal: {
        requestId: id, requestVersion: request.version, ordinal: stage.ordinal + 1,
      } } });
      if (next) {
        const activated = await tx.approvalStage.updateMany({ where: { id: next.id, status: 'WAITING' },
          data: { status: 'PENDING', activatedAt: now } });
        requireClaim(activated.count);
        status = 'PENDING_APPROVAL';
        activeStageId = next.id;
      }
    } else {
      await tx.approvalStage.updateMany({ where: { requestId: id, requestVersion: request.version, status: 'WAITING' },
        data: { status: 'SUPERSEDED' } });
    }
    await tx.purchaseRequest.update({ where: { id }, data: { status, activeStageId } });
    await tx.auditEvent.create({ data: {
      requestId: id, version: request.version, actorId: actor.id, action: input.decision,
      priorState: request.status, nextState: status, occurredAt: now,
      details: JSON.stringify({ stageId: stage.id, decision: input.decision, comment: input.comment ?? null }),
    } });
    return tx.purchaseRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
  });
}
export async function edit(db: PrismaClient, actor: User, id: string, raw: RevisionInput) {
  const { version, ...fields } = revisionInput.parse(raw);
  return transaction(db, async tx => {
    const request = await tx.purchaseRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError(404, 'Request not found');
    assertOwner(actor, request);
    requireEditable(request, version);
    const claimed = await tx.purchaseRequest.updateMany({ where: { id, version, status: request.status, requesterId: actor.id }, data: fields });
    requireClaim(claimed.count);
    await tx.auditEvent.create({ data: {
      requestId: id, version, actorId: actor.id, action: 'EDITED', priorState: request.status, nextState: request.status,
      details: JSON.stringify({ before: { vendor: request.vendor, amountCents: request.amountCents, reason: request.reason }, changes: fields }),
    } });
    return tx.purchaseRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
  });
}
export async function resubmit(db: PrismaClient, actor: User, id: string, raw: { version: number }) {
  const { version } = submissionInput.parse(raw);
  return transaction(db, async tx => {
    const request = await tx.purchaseRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError(404, 'Request not found');
    assertOwner(actor, request);
    requireEditable(request, version);
    const now = new Date();
    const nextVersion = version + 1;
    const claimed = await tx.purchaseRequest.updateMany({ where: { id, version, status: request.status, requesterId: actor.id },
      data: { version: nextVersion, status: 'PENDING_APPROVAL', activeStageId: null, submittedAt: now } });
    requireClaim(claimed.count);
    await tx.approvalStage.updateMany({ where: { requestId: id, requestVersion: version, status: { in: ['WAITING', 'PENDING'] } },
      data: { status: 'SUPERSEDED' } });
    const required = await installRoute(tx, id, nextVersion, request.amountCents, actor, now);
    const snapshot = { vendor: request.vendor, amountCents: request.amountCents, reason: request.reason };
    await tx.purchaseRevision.create({ data: { requestId: id, version: nextVersion, ...snapshot, submittedAt: now } });
    await tx.auditEvent.create({ data: {
      requestId: id, version: nextVersion, actorId: actor.id, action: version === 0 ? 'SUBMITTED' : 'RESUBMITTED',
      priorState: request.status, nextState: 'PENDING_APPROVAL', occurredAt: now,
      details: JSON.stringify({ ...snapshot, route: required }),
    } });
    return tx.purchaseRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
  });
}
