import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
const db = new PrismaClient();
const server = createApp(db).listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => {
  console.log('Riverbend demo API listening on http://127.0.0.1:' + (process.env.PORT ?? 3001));
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  server.close(() => { void db.$disconnect().then(() => process.exit(0)); });
});
