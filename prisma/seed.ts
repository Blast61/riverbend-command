import { PrismaClient } from '@prisma/client';
import { seedUsers } from './demo-users.js';
const db = new PrismaClient();
try { await seedUsers(db); console.log('Seeded five synthetic demo users'); }
finally { await db.$disconnect(); }
