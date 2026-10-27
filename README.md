# Riverbend Command

Synthetic purchase-exception approval demo. **Status: first backend slice implemented; full MVP and UI are not complete.**

Implemented: SQLite migration, five seeded identities, validated direct submission, sequential amount-based stage creation, and atomic submission audit. React UI, read queues/details, approval actions, changes and resubmission remain planned.

## Local run

Node 22.23.4 and npm 10.9.9 were used for verification.

```sh
npm ci
cp .env.example .env
npm run db:generate
touch prisma/dev.db
npm run db:migrate
npm run db:seed
npm run start:server
```

Prisma loads `.env` for database commands and client initialization. API defaults to `127.0.0.1:3001`; set `PORT` in the shell to override. `touch` initializes an empty SQLite file before migration. Use `npm run dev:server` for watch mode.

```sh
curl http://127.0.0.1:3001/api/demo-users
curl -i http://127.0.0.1:3001/api/requests \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-User-Id: employee' \
  -d '{"vendor":"Synthetic Supply","amountCents":1400000,"reason":"Demo replacement equipment"}'
npm run typecheck
npm test
```

Tests use an isolated temporary SQLite database, apply the checked-in migration and remove the test directory afterward. API tests require permission to bind local sockets. This agent environment also required IPC permission for the tsx CLI.

## API and policy

- `GET /api/health`: liveness.
- `GET /api/demo-users`: five synthetic demo identities.
- `POST /api/requests`: submit directly, creating version 1, ordered stages and one audit event. Body: trimmed nonblank vendor/reason and positive integer `amountCents` (maximum 2,147,483,647, the Prisma Int limit). Rejects unknown fields.

Below 100,000 cents: manager. From 100,000: manager then director. From 1,000,000: manager, director, VP Finance. The seeded reporting chain determines assignments. Missing routing configuration returns 409. Finance viewer submission returns 403; missing/unknown identity returns 401. Invalid payload returns 400.

`X-Demo-User-Id` is a caller-controlled demo adapter, **not production authentication**. Seed IDs: `employee`, `manager`, `director`, `vp`, `finance`. Approval authorization and self-approval denial will be implemented with the approval slice; there are currently no approval or audit mutation endpoints.

Selected follow-up workflow endpoints are `POST /api/requests/:id/approvals` (validated decision body) and `POST /api/requests/:id/submissions`. They are not implemented yet. See [design](docs/design.md) and [decisions](DECISIONS.md).

## Verification and limits

19 automated tests pass: four routing boundaries, invalid amounts/fields, identity and finance restrictions, missing hierarchy, domain money validation, and rollback when audit insertion fails. Live API smoke test verified health, five seed users and a $14,000 submission; a separate database query confirmed three stages and one audit event persisted.

Engineering review patched Prisma/Client to 6.19.3, resolving the Effect advisory. Three high audit entries remain for deepmerge-ts and its Prisma/config parents; npm also includes them through Client's optional CLI peer in production-only audits. No forced major migration was applied. See the [Milestone 1 review](docs/milestone-1-review.md) for exposure, remediation and actual validation results. Production deployment, SSO, delegation, payments and notifications are out of scope; app-level audit history is not database-admin tamper-proof.

No real business records, secrets or original confidential exercise brief are included. AI authorship and actual verification are recorded in [AI-USAGE.md](AI-USAGE.md).
