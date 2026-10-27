# Migration notes

Run `npm run db:migrate` (`prisma migrate deploy`), then `npm run db:seed`. For an initial local install, follow README's database URL and empty-file setup. Never reset a database to apply a new milestone.

- `202610260001_initial`: original users, requests, stages and audit; positive integer-cent SQL constraint.
- `202610260002_workflow`: adds nullable stage `decision` and the submitted `PurchaseRevision` snapshots with positive integer-cent constraint. Backfills each M1 request's current submitted version without changing existing stages or audit. M1 exposed no edit route, so current purchase fields are its submitted fields. The migration assumes data produced by the committed M1 API, not arbitrary manually altered databases.

Prisma models do not express the custom SQLite money CHECK constraints; preserve those SQL constraints in any future table rebuild. Snapshot/history immutability is an API/domain guarantee; database administrators can change rows.

Tests deploy real migrations to a fresh temporary database and an M1 database with existing request/stage/audit data, check backfill/history preservation, rerun deployment with no pending changes, and run the seed twice. API tests also apply all ordered SQL migrations to isolated SQLite files. Test fixture SQL splitting supports these current simple migrations, not arbitrary future SQL triggers containing semicolons; update that helper if migration syntax grows.
