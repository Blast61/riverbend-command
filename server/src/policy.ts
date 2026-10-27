export const roles = ['MANAGER', 'DIRECTOR', 'VP_FINANCE'] as const;
export function route(amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 2_147_483_647) {
    throw new Error('Amount must be positive integer cents within SQLite/Prisma Int range');
  }
  return roles.slice(0, amountCents < 100_000 ? 1 : amountCents < 1_000_000 ? 2 : 3);
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
