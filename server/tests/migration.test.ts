import { mkdtempSync, rmSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { seedUsers } from '../../prisma/demo-users.js';
function migrate(schema: string, database: string) {
  return execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', schema], {
    env: { ...process.env, DATABASE_URL: `file:${database}`, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, encoding: 'utf8',
  });
}
it('deploys on a fresh database and upgrades M1 data without changing audit or stage history', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'riverbend-migrate-'));
  const database = join(dir, 'upgrade.db');
  const fresh = join(dir, 'fresh.db');
  const db = new PrismaClient({ datasourceUrl: `file:${database}` });
  const freshDb = new PrismaClient({ datasourceUrl: `file:${fresh}` });
  try {
    writeFileSync(database, '');
    writeFileSync(fresh, '');
    // Deploy just the original migration to emulate a committed M1 installation.
    mkdirSync(join(dir, 'migrations', '202610260001_initial'), { recursive: true });
    copyFileSync('prisma/schema.prisma', join(dir, 'schema.prisma'));
    copyFileSync('prisma/migrations/migration_lock.toml', join(dir, 'migrations', 'migration_lock.toml'));
    copyFileSync('prisma/migrations/202610260001_initial/migration.sql', join(dir, 'migrations', '202610260001_initial', 'migration.sql'));
    migrate(join(dir, 'schema.prisma'), database);
    await seedUsers(db);
    const row = await db.purchaseRequest.create({ data: {
      vendor: 'M1 Synthetic Supply', amountCents: 99999, reason: 'Legacy demo', requesterId: 'employee',
      status: 'PENDING_APPROVAL', version: 1, submittedAt: new Date(),
    } });
    // M1 has no decision column yet; insert the legacy shape without newer client fields.
    await db.$executeRaw`INSERT INTO ApprovalStage (id, requestId, requestVersion, ordinal, roleRequired, assigneeId, status, activatedAt) VALUES ('legacy-stage', ${row.id}, 1, 1, 'MANAGER', 'manager', 'PENDING', ${row.submittedAt})`;
    await db.purchaseRequest.update({ where: { id: row.id }, data: { activeStageId: 'legacy-stage' } });
    const event = await db.auditEvent.create({ data: {
      requestId: row.id, version: 1, actorId: 'employee', action: 'SUBMITTED', nextState: 'PENDING_APPROVAL', details: '{}',
    } });
    expect(migrate(resolve('prisma/schema.prisma'), database)).toContain('202610260002_workflow');
    expect(await db.purchaseRevision.findUniqueOrThrow({ where: { requestId_version: { requestId: row.id, version: 1 } } })).toMatchObject({
      vendor: row.vendor, amountCents: row.amountCents, reason: row.reason, submittedAt: row.submittedAt,
    });
    expect(await db.auditEvent.findUnique({ where: { id: event.id } })).toEqual(event);
    expect(await db.approvalStage.findUniqueOrThrow({ where: { id: 'legacy-stage' } })).toMatchObject({ status: 'PENDING', decision: null });
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: row.id } })).activeStageId).toBe('legacy-stage');
    expect(migrate(resolve('prisma/schema.prisma'), database)).toContain('No pending migrations');
    await seedUsers(db);
    expect(await db.user.count()).toBe(5);
    expect(migrate(resolve('prisma/schema.prisma'), fresh)).toContain('202610260002_workflow');
    await seedUsers(freshDb);
    await seedUsers(freshDb);
    expect(await freshDb.user.count()).toBe(5);
    expect(await freshDb.purchaseRevision.count()).toBe(0);
  } finally {
    await db.$disconnect();
    await freshDb.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
