import { readFileSync, readdirSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
export async function applyMigration(db: PrismaClient, directory: string) {
  const sql = readFileSync(`prisma/migrations/${directory}/migration.sql`, 'utf8').replace(/--[^\n]*/g, '');
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
}
export async function applyMigrations(db: PrismaClient) {
  for (const dir of readdirSync('prisma/migrations', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
    await applyMigration(db, dir);
  }
}
export async function clearRequests(db: PrismaClient) {
  await db.purchaseRequest.updateMany({ data: { activeStageId: null } });
  await db.auditEvent.deleteMany();
  await db.approvalStage.deleteMany();
  await db.purchaseRevision.deleteMany();
  await db.purchaseRequest.deleteMany();
}
