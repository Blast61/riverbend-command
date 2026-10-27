import type { PrismaClient, User } from '@prisma/client';
import type { Request } from 'express';
import { HttpError } from './policy.js';
export type IdentityResolver = (db: PrismaClient, req: Request) => Promise<User>;
// Synthetic demo adapter only: a caller-controlled header is NOT authentication.
export async function demoIdentity(db: PrismaClient, req: Request) {
  const id = req.header('X-Demo-User-Id');
  if (!id) throw new HttpError(401, 'Select a demo user');
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(401, 'Unknown demo user');
  return user;
}
