import { z } from 'zod';
export const purchaseFields = z.object({
  vendor: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive().max(2_147_483_647),
  reason: z.string().trim().min(1).max(4000),
}).strict();
export const expectedVersion = z.number().int().min(0).max(2_147_483_646);
export const revisionInput = purchaseFields.partial().extend({ version: expectedVersion }).strict()
  .refine(v => v.vendor !== undefined || v.amountCents !== undefined || v.reason !== undefined, 'Supply at least one purchase field');
export const submissionInput = z.object({ version: expectedVersion }).strict();
export const approvalInput = z.object({
  stageId: z.string().trim().min(1).max(100),
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().trim().max(4000).optional(),
}).strict().refine(v => v.decision === 'APPROVED' || Boolean(v.comment?.length), {
  message: 'Rejection and requests for changes require a nonblank comment', path: ['comment'],
});
export const requestQuery = z.object({
  q: z.string().trim().max(200).optional(),
  vendor: z.string().trim().max(200).optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']).optional(),
  approverId: z.string().trim().min(1).max(100).optional(),
}).strict();
export const requestId = z.string().trim().min(1).max(100);
export type ApprovalInput = z.infer<typeof approvalInput>;
export type RevisionInput = z.infer<typeof revisionInput>;
