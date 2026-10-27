import type { PrismaClient } from '@prisma/client';
export async function seedUsers(db: PrismaClient) {
  const users = [
    { id: 'vp', name: 'Jordan Ellis', department: 'Finance', role: 'VP_FINANCE', managerId: null },
    { id: 'director', name: 'Morgan Reed', department: 'Operations', role: 'DIRECTOR', managerId: 'vp' },
    { id: 'manager', name: 'Sam Rivera', department: 'Operations', role: 'MANAGER', managerId: 'director' },
    { id: 'employee', name: 'Alex Chen', department: 'Operations', role: 'EMPLOYEE', managerId: 'manager' },
    { id: 'finance', name: 'Taylor Brooks', department: 'Finance Operations', role: 'FINANCE_VIEWER', managerId: null },
  ];
  for (const user of users) await db.user.upsert({ where: { id: user.id }, create: user, update: user });
}
