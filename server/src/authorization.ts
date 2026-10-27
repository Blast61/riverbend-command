import type { Prisma, PurchaseRequest, User, ApprovalStage } from '@prisma/client';
import { HttpError, roles } from './policy.js';
export function isApprover(actor: User) {
  return (roles as readonly string[]).includes(actor.role);
}
export function assertWritable(actor: User) {
  if (actor.role === 'FINANCE_VIEWER') throw new HttpError(403, 'Finance viewer is read-only');
}
export function assertOwner(actor: User, request: PurchaseRequest) {
  assertWritable(actor);
  if (request.requesterId !== actor.id) throw new HttpError(403, 'Only the requester may edit or submit');
}
export function assertApprover(actor: User, request: PurchaseRequest, stage: ApprovalStage) {
  assertWritable(actor);
  if (actor.id === request.requesterId) throw new HttpError(403, 'Self-approval is forbidden');
  if (!isApprover(actor) || stage.assigneeId !== actor.id || stage.roleRequired !== actor.role) {
    throw new HttpError(403, 'Only the assigned approver may decide');
  }
}
// The same predicate scopes list and detail; query filters can only narrow it.
export function readScope(actor: User): Prisma.PurchaseRequestWhereInput {
  if (actor.role === 'FINANCE_VIEWER') return {};
  return { OR: [
    { requesterId: actor.id },
    ...(isApprover(actor) ? [{ status: 'PENDING_APPROVAL', activeStage: {
      is: { assigneeId: actor.id, roleRequired: actor.role, status: 'PENDING' },
    } }] : []),
  ] };
}

export function assertEditable(request: PurchaseRequest, version: number) {
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(request.status) || request.version !== version) {
    throw new HttpError(409, 'Request is not editable at this version');
  }
}
export function userPermissions(actor: User) {
  return { canCreate: actor.role !== 'FINANCE_VIEWER', canReview: isApprover(actor), canViewAll: actor.role === 'FINANCE_VIEWER' };
}
export function requestPermissions(actor: User, request: PurchaseRequest & { activeStage: ApprovalStage | null }) {
  let canEdit = false;
  let canDecide = false;
  try { assertOwner(actor, request); assertEditable(request, request.version); canEdit = true; }
  catch (error) { if (!(error instanceof HttpError)) throw error; }
  const stage = request.activeStage;
  if (request.status === 'PENDING_APPROVAL' && stage?.status === 'PENDING' && stage.requestId === request.id && stage.requestVersion === request.version) {
    try { assertApprover(actor, request, stage); canDecide = true; }
    catch (error) { if (!(error instanceof HttpError)) throw error; }
  }
  return { canEdit, canResubmit: canEdit, canDecide };
}
