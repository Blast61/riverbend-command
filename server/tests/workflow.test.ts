import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedUsers } from '../../prisma/demo-users.js';
import { applyMigrations, clearRequests } from './database.js';
const dir = mkdtempSync(join(tmpdir(), 'riverbend-workflow-'));
const db = new PrismaClient({ datasourceUrl: `file:${join(dir, 'test.db')}` });
const app = createApp(db);
const purchase = { vendor: 'Synthetic Tools', amountCents: 1400000, reason: 'Replace equipment' };
const post = (path: string, user: string, body: object) => request(app).post(path).set('X-Demo-User-Id', user).send(body);
const patch = (id: string, user: string, body: object) => request(app).patch(`/api/requests/${id}`).set('X-Demo-User-Id', user).send(body);
const get = (path: string, user: string) => request(app).get(path).set('X-Demo-User-Id', user);
async function create(amountCents = purchase.amountCents, user = 'employee') {
  const res = await post('/api/requests', user, { ...purchase, amountCents });
  expect(res.status).toBe(201);
  return res.body;
}
async function approve(id: string, stageId: string, user = 'manager', decision = 'APPROVED', comment?: string) {
  return post(`/api/requests/${id}/approvals`, user, { stageId, decision, ...(comment !== undefined ? { comment } : {}) });
}
beforeAll(async () => {
  await applyMigrations(db);
  await seedUsers(db);
  await db.user.createMany({ data: [
    { id: 'other', name: 'Demo Other', department: 'Operations', role: 'EMPLOYEE', managerId: 'manager' },
    { id: 'other-manager', name: 'Demo Other Manager', department: 'Operations', role: 'MANAGER', managerId: 'director' },
  ] });
});
beforeEach(async () => { await clearRequests(db); });
afterAll(async () => { await db.$disconnect(); rmSync(dir, { recursive: true, force: true }); });
describe('approval decisions', () => {
  it('progresses manager → director → VP, ends approved, and preserves exact decisions', async () => {
    let row = await create();
    for (const [index, user] of ['manager', 'director', 'vp'].entries()) {
      const oldStage = row.activeStageId;
      const response = await approve(row.id, oldStage, user);
      expect(response.status).toBe(201);
      row = response.body;
      expect(row.stages[index]).toMatchObject({ decision: 'APPROVED', status: 'APPROVED', assigneeId: user });
      expect(row.stages[index].decidedAt).toBeTruthy();
      expect(row.status).toBe(index === 2 ? 'APPROVED' : 'PENDING_APPROVAL');
      expect(row.activeStage?.assigneeId ?? null).toBe(index === 2 ? null : ['director', 'vp'][index]);
    }
    expect(row.activeStageId).toBeNull();
    const detail = await get(`/api/requests/${row.id}`, 'finance');
    expect(detail.status).toBe(200);
    expect(detail.body.events.map((e: { action: string }) => e.action)).toEqual(['SUBMITTED', 'APPROVED', 'APPROVED', 'APPROVED']);
    expect(detail.body.events.map((e: { actorId: string }) => e.actorId)).toEqual(['employee', 'manager', 'director', 'vp']);
    expect(detail.body.revisions).toHaveLength(1);
  });
  it('completes a manager-only request after one approval', async () => {
    const row = await create(99999);
    const res = await approve(row.id, row.activeStageId);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.activeStageId).toBeNull();
  });
  it.each(['REJECTED', 'CHANGES_REQUESTED'])('requires a nonblank comment for %s', async decision => {
    const row = await create();
    for (const comment of [undefined, '', '   ']) {
      expect((await approve(row.id, row.activeStageId, 'manager', decision, comment)).status).toBe(400);
    }
    expect(await db.auditEvent.count()).toBe(1);
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('PENDING_APPROVAL');
  });
  it.each(['REJECTED', 'CHANGES_REQUESTED'])('records %s and deactivates all unfinished stages', async decision => {
    const row = await create();
    const res = await approve(row.id, row.activeStageId, 'manager', decision, '  Explain purchase  ');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(decision);
    expect(res.body.activeStageId).toBeNull();
    expect(res.body.stages.every((s: { status: string }) => s.status === 'SUPERSEDED')).toBe(true);
    expect(res.body.stages[0]).toMatchObject({ decision, decisionComment: 'Explain purchase' });
    expect(JSON.parse(res.body.events[1].details)).toMatchObject({ comment: 'Explain purchase', stageId: row.activeStageId });
    expect((await approve(row.id, row.activeStageId)).status).toBe(409);
    if (decision === 'REJECTED') {
      expect((await patch(row.id, 'employee', { version: 1, reason: 'Retry' })).status).toBe(409);
      expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })).status).toBe(409);
    }
  });
  it.each(['other-manager', 'other', 'finance', 'employee'])('denies active decisions by %s', async actor => {
    const row = await create();
    expect((await approve(row.id, row.activeStageId, actor)).status).toBe(403);
    expect(await db.auditEvent.count()).toBe(1);
  });
  it('denies a director acting out of order', async () => {
    const row = await create();
    expect((await approve(row.id, row.stages[1].id, 'director')).status).toBe(409);
    expect((await approve(row.id, row.activeStageId, 'director')).status).toBe(403);
  });
  it('blocks self-approval even for a qualified, assigned approver and flags it', async () => {
    const row = await create();
    // Deliberately misconfigured owner; seed's normal reporting chain has no conflicts.
    await db.purchaseRequest.update({ where: { id: row.id }, data: { requesterId: 'manager' } });
    expect((await approve(row.id, row.activeStageId, 'manager')).status).toBe(403);
    expect((await get(`/api/requests/${row.id}`, 'manager')).body.blockedAssignment).toBe(true);
    expect(await db.auditEvent.count()).toBe(1);
  });
  it('denies a mismatched role even if the user is assigned', async () => {
    const row = await create();
    await db.approvalStage.update({ where: { id: row.activeStageId }, data: { assigneeId: 'director' } });
    expect((await approve(row.id, row.activeStageId, 'director')).status).toBe(403);
  });
  it('denies duplicate, foreign and stale stage IDs without another audit', async () => {
    const row = await create();
    const foreign = await create();
    expect((await approve(row.id, foreign.activeStageId)).status).toBe(409);
    expect((await approve(row.id, row.activeStageId)).status).toBe(201);
    expect((await approve(row.id, row.activeStageId)).status).toBe(409);
    expect(await db.auditEvent.count({ where: { requestId: row.id } })).toBe(2);
  });
  it('permits exactly one concurrent decision on the same stage', async () => {
    const row = await create();
    const responses = await Promise.all([approve(row.id, row.activeStageId), approve(row.id, row.activeStageId)]);
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await db.auditEvent.count()).toBe(2);
    expect(await db.approvalStage.count({ where: { requestId: row.id, status: 'PENDING' } })).toBe(1);
  });
  it.each(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'])('rolls back %s when its audit insert fails', async decision => {
    const row = await create();
    const before = await db.purchaseRequest.findUniqueOrThrow({ where: { id: row.id }, include: { stages: true } });
    await db.$executeRawUnsafe("CREATE TRIGGER fail_audit BEFORE INSERT ON AuditEvent BEGIN SELECT RAISE(ABORT, 'audit failure'); END");
    try {
      expect((await approve(row.id, row.activeStageId, 'manager', decision, 'Demo reason')).status).toBe(500);
      const after = await db.purchaseRequest.findUniqueOrThrow({ where: { id: row.id }, include: { stages: true } });
      expect(after).toEqual(before);
      expect(await db.auditEvent.count()).toBe(1);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_audit'); }
  });
  it('rolls back the decided stage if activating the next stage fails', async () => {
    const row = await create();
    await db.$executeRawUnsafe("CREATE TRIGGER fail_activation BEFORE UPDATE ON ApprovalStage WHEN NEW.ordinal = 2 AND NEW.status = 'PENDING' BEGIN SELECT RAISE(ABORT, 'activation failure'); END");
    try {
      expect((await approve(row.id, row.activeStageId)).status).toBe(500);
      const persisted = await db.purchaseRequest.findUniqueOrThrow({ where: { id: row.id }, include: { stages: true } });
      expect(persisted.activeStageId).toBe(row.activeStageId);
      expect(persisted.stages[0].decision).toBeNull();
      expect(persisted.stages[0].status).toBe('PENDING');
      expect(persisted.stages[1].status).toBe('WAITING');
      expect(await db.auditEvent.count()).toBe(1);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_activation'); }
  });
  it('rejects malformed decision payloads', async () => {
    const row = await create();
    for (const body of [{ stageId: row.activeStageId, decision: 'APPROVE' }, { decision: 'APPROVED' },
      { stageId: row.activeStageId, decision: 'APPROVED', actorId: 'manager' }]) {
      expect((await post(`/api/requests/${row.id}/approvals`, 'manager', body)).status).toBe(400);
    }
  });
});
describe('editing and versioned resubmissions', () => {
  async function returned(amountCents = 99999) {
    const row = await create(amountCents);
    expect((await approve(row.id, row.activeStageId, 'manager', 'CHANGES_REQUESTED', 'Clarify amount')).status).toBe(201);
    return row;
  }
  it('forbids edits/resubmissions during pending approval or after final approval', async () => {
    const row = await create(99999);
    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      expect((await patch(row.id, 'employee', { version: 1, amountCents: 100 })).status).toBe(409);
      expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })).status).toBe(409);
      if (status === 'PENDING_APPROVAL') expect((await approve(row.id, row.activeStageId)).status).toBe(201);
    }
  });
  it.each(['manager', 'other', 'finance'])('forbids returned-request edits and resubmissions by %s', async actor => {
    const row = await returned();
    expect((await patch(row.id, actor, { version: 1, vendor: 'Changed' })).status).toBe(403);
    expect((await post(`/api/requests/${row.id}/submissions`, actor, { version: 1 })).status).toBe(403);
    expect(await db.auditEvent.count()).toBe(2);
  });
  it('preserves snapshots and decisions, increases route after edits, rejects old stage IDs', async () => {
    const row = await create(100000);
    expect((await approve(row.id, row.activeStageId)).status).toBe(201);
    const decision = await approve(row.id, row.stages[1].id, 'director', 'CHANGES_REQUESTED', 'Revise specifications');
    const priorStageHistory = decision.body.stages;
    const oldEvents = await db.auditEvent.findMany({ where: { requestId: row.id }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
    const edited = await patch(row.id, 'employee', { version: 1, amountCents: 1400000, vendor: 'Revised Supply', reason: 'Expanded replacement' });
    expect(edited.status).toBe(200);
    expect(edited.body.revisions[0]).toMatchObject({ version: 1, ...purchase, amountCents: 100000 });
    expect(edited.body.version).toBe(1);
    const resubmitted = await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 });
    expect(resubmitted.status).toBe(201);
    const fresh = resubmitted.body;
    expect(fresh.version).toBe(2);
    expect(fresh.stages.slice(0, 2)).toEqual(priorStageHistory);
    expect(fresh.stages.filter((s: { requestVersion: number }) => s.requestVersion === 2).map((s: { status: string }) => s.status)).toEqual(['PENDING', 'WAITING', 'WAITING']);
    expect(fresh.revisions).toHaveLength(2);
    expect(fresh.revisions[1]).toMatchObject({ version: 2, amountCents: 1400000, vendor: 'Revised Supply' });
    expect(fresh.activeStage.assigneeId).toBe('manager');
    expect((await approve(row.id, row.activeStageId)).status).toBe(409);
    expect((await approve(row.id, row.stages[1].id, 'director')).status).toBe(409);
    expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })).status).toBe(409);
    expect((await patch(row.id, 'employee', { version: 1, reason: 'Stale edit' })).status).toBe(409);
    const eventsAfter = await db.auditEvent.findMany({ where: { requestId: row.id }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
    expect(eventsAfter.slice(0, oldEvents.length)).toEqual(oldEvents);
    expect(eventsAfter.map(e => e.action)).toEqual(['SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'EDITED', 'RESUBMITTED']);
  });
  it('recalculates a reduced amount and repeats manager approval', async () => {
    const row = await returned(1400000);
    expect((await patch(row.id, 'employee', { version: 1, amountCents: 99999 })).status).toBe(200);
    const res = await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 });
    expect(res.status).toBe(201);
    expect(res.body.stages.filter((s: { requestVersion: number }) => s.requestVersion === 2)).toHaveLength(1);
    expect((await approve(row.id, res.body.activeStageId)).body.status).toBe('APPROVED');
  });
  it('supports repeated return/resubmit cycles without reusing approvals', async () => {
    const row = await returned();
    const second = await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 });
    expect(second.status).toBe(201);
    expect((await approve(row.id, second.body.activeStageId, 'manager', 'CHANGES_REQUESTED', 'One more change')).status).toBe(201);
    expect((await patch(row.id, 'employee', { version: 1, reason: 'Old editor' })).status).toBe(409);
    expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })).status).toBe(409);
    const third = await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 2 });
    expect(third.status).toBe(201);
    expect(third.body.version).toBe(3);
    expect(third.body.revisions).toHaveLength(3);
    expect(third.body.stages[0].decision).toBe('CHANGES_REQUESTED');
  });
  it('supports owner edits and initial submission of an existing draft', async () => {
    const row = await db.purchaseRequest.create({ data: {
      ...purchase, requesterId: 'employee', status: 'DRAFT', version: 0, submittedAt: new Date(),
    } });
    expect((await patch(row.id, 'employee', { version: 0, vendor: 'Draft edited' })).status).toBe(200);
    const res = await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 0 });
    expect(res.status).toBe(201);
    expect(res.body.version).toBe(1);
    expect(res.body.revisions[0].vendor).toBe('Draft edited');
  });
  it.each(['edit', 'resubmit'])('rolls back %s if its audit insert fails', async operation => {
    const row = await returned();
    const before = await get(`/api/requests/${row.id}`, 'employee');
    await db.$executeRawUnsafe("CREATE TRIGGER fail_audit BEFORE INSERT ON AuditEvent BEGIN SELECT RAISE(ABORT, 'audit failure'); END");
    try {
      const res = operation === 'edit' ? await patch(row.id, 'employee', { version: 1, amountCents: 1200000 }) :
        await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 });
      expect(res.status).toBe(500);
      const after = await get(`/api/requests/${row.id}`, 'employee');
      expect(after.body).toEqual(before.body);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_audit'); }
  });
  it('rolls back new version/route if resubmission routing is missing', async () => {
    const row = await returned();
    await db.user.update({ where: { id: 'employee' }, data: { managerId: null } });
    try {
      expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })).status).toBe(409);
      const persisted = await get(`/api/requests/${row.id}`, 'employee');
      expect(persisted.body.version).toBe(1);
      expect(persisted.body.revisions).toHaveLength(1);
      expect(persisted.body.status).toBe('CHANGES_REQUESTED');
      expect(persisted.body.events).toHaveLength(2);
    } finally { await db.user.update({ where: { id: 'employee' }, data: { managerId: 'manager' } }); }
  });
  it('allows only one concurrent resubmission', async () => {
    const row = await returned();
    const results = await Promise.all([post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 }), post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1 })]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await db.purchaseRevision.count()).toBe(2);
  });
  it('rejects invalid, empty or workflow-overriding edits', async () => {
    const row = await returned();
    for (const payload of [{}, { version: 1 }, { version: 1, amountCents: -1 }, { version: 1, requesterId: 'other' },
      { version: 1, status: 'APPROVED' }, { version: 1, vendor: ' ' }, { version: 1, reason: ' ' }, { version: 1, activeStageId: 'fake' }]) {
      expect((await patch(row.id, 'employee', payload)).status).toBe(400);
    }
    expect((await post(`/api/requests/${row.id}/submissions`, 'employee', { version: 1, amountCents: 10 })).status).toBe(400);
  });
});
describe('read scopes, queries and identity', () => {
  it('limits employees to own requests, approvers to active queue plus own, finance to all', async () => {
    const own = await create();
    const other = await create(99999, 'other');
    expect((await get('/api/requests', 'employee')).body.map((r: { id: string }) => r.id)).toEqual([own.id]);
    expect((await get('/api/requests', 'manager')).body).toHaveLength(2);
    expect((await get('/api/requests', 'director')).body).toHaveLength(0);
    expect((await get('/api/requests', 'finance')).body).toHaveLength(2);
    expect((await get(`/api/requests/${other.id}`, 'employee')).status).toBe(404);
    expect((await get(`/api/requests/${own.id}`, 'director')).status).toBe(404);
    expect((await approve(own.id, own.activeStageId)).status).toBe(201);
    expect((await get(`/api/requests/${own.id}`, 'manager')).status).toBe(404);
    expect((await get(`/api/requests/${own.id}`, 'director')).body.activeStage.assigneeId).toBe('director');
  });
  it('intersects search and filters with scope and rejects malformed queries', async () => {
    const own = await create();
    const other = await create(99999, 'other');
    for (const filter of [`q=${own.id}`, 'q=Synthetic', 'vendor=Tools', 'status=PENDING_APPROVAL&approverId=manager']) {
      const res = await get(`/api/requests?${filter}`, 'employee');
      expect(res.status).toBe(200);
      expect(res.body.map((r: { id: string }) => r.id)).toEqual([own.id]);
    }
    expect((await get(`/api/requests?q=${other.id}`, 'employee')).body).toHaveLength(0);
    expect((await get('/api/requests?approverId=director', 'finance')).body).toHaveLength(0);
    expect((await get('/api/requests?status=APPROVED', 'finance')).body).toHaveLength(0);
    for (const query of ['status=INVALID', 'status=APPROVED&status=REJECTED', 'requesterId=other', 'approverId=', 'q[x]=foo', `q=${'x'.repeat(201)}`]) {
      expect((await get(`/api/requests?${query}`, 'finance')).status).toBe(400);
    }
  });
  it('exposes delayed active assignment without delegation', async () => {
    const row = await create();
    await db.approvalStage.update({ where: { id: row.activeStageId }, data: { activatedAt: new Date(Date.now() - 73 * 3600000) } });
    expect((await get(`/api/requests/${row.id}`, 'finance')).body.delayed).toBe(true);
  });
  it('requires known demo identity for every workflow/read endpoint', async () => {
    const row = await create();
    for (const user of ['', 'unknown']) {
      expect((await get('/api/requests', user)).status).toBe(401);
      expect((await get(`/api/requests/${row.id}`, user)).status).toBe(401);
      expect((await approve(row.id, row.activeStageId, user)).status).toBe(401);
      expect((await patch(row.id, user, { version: 1, reason: 'Edit' })).status).toBe(401);
      expect((await post(`/api/requests/${row.id}/submissions`, user, { version: 1 })).status).toBe(401);
    }
  });
  it('can replace demo header identity with a trusted actor resolver', async () => {
    const actor = await db.user.findUniqueOrThrow({ where: { id: 'employee' } });
    const trustedApp = createApp(db, async () => actor);
    const result = await request(trustedApp).post('/api/requests').set('X-Demo-User-Id', 'vp').send(purchase);
    expect(result.status).toBe(201);
    expect(result.body.requesterId).toBe('employee');
    expect(result.body.events[0].actorId).toBe('employee');
  });
  it('rejects malformed JSON and oversized bodies as client errors', async () => {
    expect((await request(app).post('/api/requests').set('Content-Type', 'application/json').set('X-Demo-User-Id', 'employee').send('{')).status).toBe(400);
    expect((await post('/api/requests', 'employee', { ...purchase, reason: 'x'.repeat(17000) })).status).toBe(413);
    expect(await db.purchaseRequest.count()).toBe(0);
  });
  it('returns server-derived action flags for owner, assigned approver and finance', async () => {
    const row = await create();
    expect(row.permissions).toEqual({ canEdit: false, canResubmit: false, canDecide: false });
    expect((await get(`/api/requests/${row.id}`, 'manager')).body.permissions.canDecide).toBe(true);
    expect((await get(`/api/requests/${row.id}`, 'finance')).body.permissions).toEqual({ canEdit: false, canResubmit: false, canDecide: false });
    const decision = await approve(row.id, row.activeStageId, 'manager', 'CHANGES_REQUESTED', 'Clarify');
    expect(decision.body.permissions.canDecide).toBe(false);
    expect((await get(`/api/requests/${row.id}`, 'employee')).body.permissions).toEqual({ canEdit: true, canResubmit: true, canDecide: false });
    const users = await get('/api/demo-users', 'finance');
    expect(users.body.find((u: { id: string }) => u.id === 'finance').permissions).toEqual({ canCreate: false, canReview: false, canViewAll: true });
  });
  it('returns 404 for missing resources and exposes no audit mutation route', async () => {
    expect((await get('/api/requests/missing', 'finance')).status).toBe(404);
    expect((await approve('missing', 'missing')).status).toBe(404);
    expect((await patch('missing', 'employee', { version: 1, reason: 'Edit' })).status).toBe(404);
    expect((await post('/api/requests/missing/submissions', 'employee', { version: 1 })).status).toBe(404);
    expect((await request(app).delete('/api/audit-events/anything').set('X-Demo-User-Id', 'finance')).status).toBe(404);
    expect((await request(app).patch('/api/audit-events/anything').set('X-Demo-User-Id', 'finance').send({})).status).toBe(404);
  });
});
