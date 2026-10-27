import type { RequestDetail, Stage, User } from '../types';
export const employee: User = { id: 'employee', name: 'Alex Chen', role: 'EMPLOYEE', department: 'Operations', permissions: { canCreate: true, canReview: false, canViewAll: false } };
export const manager: User = { id: 'manager', name: 'Sam Rivera', role: 'MANAGER', department: 'Operations', permissions: { canCreate: true, canReview: true, canViewAll: false } };
export const finance: User = { id: 'finance', name: 'Taylor Brooks', role: 'FINANCE_VIEWER', department: 'Finance', permissions: { canCreate: false, canReview: false, canViewAll: true } };
const timestamp = '2026-10-26T18:00:00.000Z';
export function stage(overrides: Partial<Stage> = {}): Stage { return {
  id: 'stage-1', requestId: 'request-1', requestVersion: 1, ordinal: 1, roleRequired: 'MANAGER', assigneeId: manager.id, assignee: manager,
  status: 'PENDING', activatedAt: timestamp, decidedAt: null, decision: null, decisionComment: null, ...overrides,
}; }
export function detail(overrides: Partial<RequestDetail> = {}): RequestDetail { return {
  id: 'request-1', vendor: 'Synthetic Pumps', amountCents: 1400000, reason: 'Demo equipment', requesterId: employee.id,
  version: 1, status: 'PENDING_APPROVAL', submittedAt: timestamp, updatedAt: timestamp,
  activeStageId: 'stage-1', activeStage: stage(), delayed: false, blockedAssignment: false,
  permissions: { canEdit: false, canResubmit: false, canDecide: false },
  stages: [stage(), stage({ id: 'stage-2', roleRequired: 'DIRECTOR', ordinal: 2, status: 'WAITING', assignee: { id: 'director', name: 'Morgan Reed' }, assigneeId: 'director', activatedAt: null })],
  revisions: [{ requestId: 'request-1', version: 1, vendor: 'Synthetic Pumps', amountCents: 1400000, reason: 'Demo equipment', submittedAt: timestamp }],
  events: [{ id: 'event-1', version: 1, actorId: employee.id, actor: employee, action: 'SUBMITTED', priorState: null, nextState: 'PENDING_APPROVAL', details: '{}', occurredAt: timestamp }], ...overrides,
}; }
