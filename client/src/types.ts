export type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
export type Decision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export interface User {
  id: string; name: string; department: string; role: string;
  permissions: { canCreate: boolean; canReview: boolean; canViewAll: boolean };
}
export interface Stage {
  id: string; requestId: string; requestVersion: number; ordinal: number; roleRequired: string;
  assigneeId: string; assignee: Pick<User, 'id' | 'name'>;
  status: 'WAITING' | 'PENDING' | 'APPROVED' | 'SUPERSEDED';
  activatedAt: string | null; decidedAt: string | null; decision: Decision | null; decisionComment: string | null;
}
export interface PurchaseFields { vendor: string; amountCents: number; reason: string }
export interface RequestRow extends PurchaseFields {
  id: string; requesterId: string; status: RequestStatus; version: number;
  activeStageId: string | null; activeStage: Stage | null; submittedAt: string; updatedAt: string;
  delayed: boolean; blockedAssignment: boolean;
  permissions: { canEdit: boolean; canResubmit: boolean; canDecide: boolean };
}
export interface Revision extends PurchaseFields { requestId: string; version: number; submittedAt: string }
export interface AuditEvent {
  id: string; version: number; actorId: string; actor: Pick<User, 'id' | 'name'>;
  action: string; priorState: string | null; nextState: string; details: string; occurredAt: string;
}
export interface RequestDetail extends RequestRow { stages: Stage[]; revisions: Revision[]; events: AuditEvent[] }
