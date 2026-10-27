import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedUsers } from '../../prisma/demo-users.js';
import { route } from '../src/policy.js';
import { applyMigrations, clearRequests } from './database.js';
const dir = mkdtempSync(join(tmpdir(), 'riverbend-test-'));
const db = new PrismaClient({ datasourceUrl: `file:${join(dir, 'test.db')}` });
const app = createApp(db);
const body = { vendor: 'Synthetic Supply', amountCents: 1400000, reason: 'Demo replacement equipment' };
beforeAll(async () => {
  await applyMigrations(db);
  await seedUsers(db);
});
beforeEach(async () => { await clearRequests(db); });
afterAll(async () => { await db.$disconnect(); rmSync(dir, { recursive: true, force: true }); });
describe('first submission slice', () => {
  it.each([
    [99999, ['MANAGER']],
    [100000, ['MANAGER', 'DIRECTOR']],
    [999999, ['MANAGER', 'DIRECTOR']],
    [1000000, ['MANAGER', 'DIRECTOR', 'VP_FINANCE']],
  ])('routes %i cents and persists exactly one active stage and audit event', async (amountCents, expected) => {
    const res = await request(app).post('/api/requests').set('X-Demo-User-Id', 'employee').send({ ...body, amountCents });
    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe('employee');
    expect(res.body.version).toBe(1);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    expect(res.body.stages.map((s: { roleRequired: string }) => s.roleRequired)).toEqual(expected);
    expect(res.body.stages.map((s: { status: string }) => s.status)).toEqual(expected.map((_, i) => i ? 'WAITING' : 'PENDING'));
    expect(res.body.stages.map((s: { assigneeId: string }) => s.assigneeId)).toEqual(['manager', 'director', 'vp'].slice(0, expected.length));
    expect(res.body.activeStageId).toBe(res.body.stages[0].id);
    expect(res.body.stages[0].activatedAt).toBeTruthy();
    expect(res.body.stages.slice(1).every((s: { activatedAt: string | null }) => s.activatedAt === null)).toBe(true);
    const events = await db.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ actorId: 'employee', action: 'SUBMITTED', version: 1, nextState: 'PENDING_APPROVAL' });
    expect(JSON.parse(events[0].details)).toMatchObject({ ...body, amountCents, route: expected });
  });
  it.each([0, -1, 1.5, 2147483648, '1000', null])('rejects invalid cents %s without writes', async amountCents => {
    const res = await request(app).post('/api/requests').set('X-Demo-User-Id', 'employee').send({ ...body, amountCents });
    expect(res.status).toBe(400);
    expect(await db.purchaseRequest.count()).toBe(0);
    expect(await db.auditEvent.count()).toBe(0);
  });
  it.each([{ vendor: ' ' }, { reason: ' ' }, { requesterId: 'vp' }])('rejects blank fields or identity injection %j', async invalid => {
    expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'employee').send({ ...body, ...invalid })).status).toBe(400);
  });
  it('requires known identity and prevents finance writes', async () => {
    expect((await request(app).post('/api/requests').send(body)).status).toBe(401);
    expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'unknown').send(body)).status).toBe(401);
    expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'finance').send(body)).status).toBe(403);
    expect(await db.purchaseRequest.count()).toBe(0);
  });
  it('rolls back request and stages when the audit insert fails', async () => {
    await db.$executeRawUnsafe("CREATE TRIGGER fail_audit BEFORE INSERT ON AuditEvent BEGIN SELECT RAISE(ABORT, 'test audit failure'); END");
    try {
      expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'employee').send(body)).status).toBe(500);
      expect(await db.purchaseRequest.count()).toBe(0);
      expect(await db.approvalStage.count()).toBe(0);
      expect(await db.auditEvent.count()).toBe(0);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_audit'); }
  });
  it('rolls back a request and earlier stages when a later stage insert fails', async () => {
    await db.$executeRawUnsafe("CREATE TRIGGER fail_stage BEFORE INSERT ON ApprovalStage WHEN NEW.ordinal = 2 BEGIN SELECT RAISE(ABORT, 'test stage failure'); END");
    try {
      expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'employee').send(body)).status).toBe(500);
      expect(await db.purchaseRequest.count()).toBe(0);
      expect(await db.approvalStage.count()).toBe(0);
      expect(await db.auditEvent.count()).toBe(0);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_stage'); }
  });
  it('rejects invalid money at the database boundary as well', async () => {
    await expect(db.purchaseRequest.create({ data: {
      ...body, amountCents: 0, requesterId: 'employee', status: 'PENDING_APPROVAL',
      version: 1, submittedAt: new Date(),
    } })).rejects.toThrow();
    expect(await db.purchaseRequest.count()).toBe(0);
  });
  it('refuses missing routing configuration without partial writes', async () => {
    expect((await request(app).post('/api/requests').set('X-Demo-User-Id', 'vp').send(body)).status).toBe(409);
    expect(await db.purchaseRequest.count()).toBe(0);
  });
  it('guards domain money values independently of HTTP validation', () => {
    for (const value of [NaN, Infinity, -1, 0, 0.1, 2147483648]) expect(() => route(value)).toThrow();
    expect(route(1)).toEqual(['MANAGER']);
  });
});
