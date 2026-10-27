import type { Prisma, PrismaClient, User, PurchaseRequest, ApprovalStage } from '@prisma/client';
import type { z } from 'zod';
import { readScope, requestPermissions } from './authorization.js';
import { HttpError } from './policy.js';
import { requestQuery } from './validation.js';
import { detailInclude } from './workflow-store.js';
export function presentRequest<T extends PurchaseRequest & { activeStage: ApprovalStage | null }>(actor: User, row: T) {
  return { ...row, permissions: requestPermissions(actor, row),
    blockedAssignment: Boolean(row.activeStage && row.activeStage.assigneeId === row.requesterId),
    delayed: Boolean(row.activeStage?.activatedAt && Date.now() - row.activeStage.activatedAt.getTime() > 72 * 60 * 60 * 1000),
  };
}
export async function listRequests(db: PrismaClient, actor: User, raw: z.infer<typeof requestQuery>) {
  const query = requestQuery.parse(raw);
  const filters: Prisma.PurchaseRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.vendor ? { vendor: { contains: query.vendor } } : {}),
    ...(query.approverId ? { activeStage: { is: { assigneeId: query.approverId, status: 'PENDING' } } } : {}),
    ...(query.q ? { OR: [{ vendor: { contains: query.q } }, { id: { contains: query.q } }] } : {}),
  };
  const rows = await db.purchaseRequest.findMany({ where: { AND: [readScope(actor), filters] },
    include: { activeStage: { include: { assignee: true } } }, orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }] });
  return rows.map(row => presentRequest(actor, row));
}
export async function getRequest(db: PrismaClient, actor: User, id: string) {
  const row = await db.purchaseRequest.findFirst({ where: { AND: [{ id }, readScope(actor)] }, include: detailInclude });
  if (!row) throw new HttpError(404, 'Request not found');
  return presentRequest(actor, row);
}
