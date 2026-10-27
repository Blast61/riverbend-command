import { Prisma, type PrismaClient, type User } from '@prisma/client';
import { HttpError, route } from './policy.js';
// SQLite transactions serialize mutations. Conditional claims additionally reject
// replayed stage/version IDs; contention is a retryable client-visible conflict.
export async function transaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  try { return await db.$transaction(work); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P1008', 'P2028'].includes(error.code)) {
      throw new HttpError(409, 'Workflow changed or database busy; reload before retrying');
    }
    throw error;
  }
}
export async function installRoute(tx: Prisma.TransactionClient, requestId: string, version: number, amountCents: number, actor: User, now: Date) {
  const required = route(amountCents);
  let managerId = actor.managerId;
  for (const [index, roleRequired] of required.entries()) {
    const assignee = managerId ? await tx.user.findUnique({ where: { id: managerId } }) : null;
    if (!assignee || assignee.role !== roleRequired) throw new HttpError(409, `No configured ${roleRequired} in reporting chain`);
    const stage = await tx.approvalStage.create({ data: {
      requestId, requestVersion: version, ordinal: index + 1, roleRequired, assigneeId: assignee.id,
      status: index === 0 ? 'PENDING' : 'WAITING', activatedAt: index === 0 ? now : null,
    } });
    if (index === 0) await tx.purchaseRequest.update({ where: { id: requestId }, data: { activeStageId: stage.id } });
    managerId = assignee.managerId;
  }
  return required;
}
export const detailInclude = {
  activeStage: { include: { assignee: true } },
  stages: { orderBy: [{ requestVersion: 'asc' }, { ordinal: 'asc' }], include: { assignee: true } },
  revisions: { orderBy: { version: 'asc' } },
  events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], include: { actor: true } },
} satisfies Prisma.PurchaseRequestInclude;
