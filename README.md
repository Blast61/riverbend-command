# Riverbend Command

Synthetic purchase-exception approval demo. **Status: Milestone 2 backend implemented, verified and candidate-approved for the local exercise. UI is not implemented.**

Implemented: SQLite migrations, five seeded identities, direct submission, sequential decisions, owner-only editing/resubmission, immutable revision snapshots, role-scoped reads/search and transactional audit. No frontend work is included.

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

Tests use an isolated temporary SQLite database, apply the checked-in migrations and remove the test directory afterward. API tests require permission to bind local sockets. This agent environment also required IPC permission for the tsx CLI.

## API and policy

- `GET /api/health`: liveness.
- `GET /api/demo-users`: five synthetic demo identities.
- `POST /api/requests`: submit directly, creating version 1, ordered stages and one audit event. Body: trimmed nonblank vendor/reason and positive integer `amountCents` (maximum 2,147,483,647, the Prisma Int limit). Rejects unknown fields.

Below 100,000 cents: manager. From 100,000: manager then director. From 1,000,000: manager, director, VP Finance. The seeded reporting chain determines assignments. Missing routing configuration returns 409. Finance viewer submission returns 403; missing/unknown identity returns 401. Invalid payload returns 400.

`X-Demo-User-Id` is a caller-controlled demo adapter, **not production authentication**. Seed IDs: `employee`, `manager`, `director`, `vp`, `finance`. Backend enforces assigned approver, role, ownership, self-approval, finance read-only and state/version rules. No audit update/delete endpoints exist. A trusted identity resolver can replace the demo adapter; Entra token validation/mapping is not implemented.

Additional implemented endpoints:

- `GET /api/requests?q=&vendor=&status=&approverId=`: own requests plus active assigned queue, or finance read-all. Filters intersect access scope.
- `GET /api/requests/:id`: current stage/assignee, all submitted revision snapshots, stage history and chronological audit. Hidden/missing records return 404.
- `POST /api/requests/:id/approvals`: `{ "stageId": "<active stage ID>", "decision": "APPROVED", "comment": "Optional approval note" }`. Other decision values: `REJECTED`, `CHANGES_REQUESTED`; both require nonblank `comment`.
- `PATCH /api/requests/:id`: `{ "version": 1, "amountCents": 1000000 }` (at least one of vendor/amountCents/reason). Owner-only in draft/returned state; appends an edit audit event.
- `POST /api/requests/:id/submissions`: `{ "version": 1 }`. Owner-only; creates version 2+, new snapshot and restarted route. Existing version-0 drafts submit as version 1; no draft-creation endpoint added.

Use returned request IDs, activeStageId and version in subsequent calls. Decisions/submissions return 201 and updated detail; edits return 200. Stale IDs/versions/state conflicts return 409. Terminal requests cannot be edited/resubmitted. Non-owner approvers lose detail access when a request leaves their active queue. See [design](docs/design.md) for full contract and [decisions](DECISIONS.md) for accepted policy.

Existing M1 databases: run `npm run db:migrate` then `npm run db:seed`, without a reset. The additive migration backfills submitted snapshots and retains prior stages/audit. [Migration notes](prisma/migrations/README.md) describe the compatibility boundary.

## Verification and limits

60 automated tests pass across three files, including all 19 M1 cases. Coverage includes sequential/final decisions, comments, permissions/self-approval, revisions/rerouting/history, read scopes/filters, stale/duplicate/concurrent actions, failure rollback, and actual fresh/upgrade migration deployment. TypeScript passes. Live workflow walkthrough verified returned revision, all three new approvals, finance/stale-stage denials and preserved history. Detailed commands/results: [Milestone 2 review](docs/milestone-2-review.md).

Engineering review patched Prisma/Client to 6.19.3, resolving the Effect advisory. Three high audit entries remain for deepmerge-ts and its Prisma/config parents; npm also includes them through Client's optional CLI peer in production-only audits. Latest audit remains unchanged at those three high entries; no dependencies changed in Milestone 2 and no forced major migration was applied. See the [Milestone 1 review](docs/milestone-1-review.md) for exposure, remediation and actual validation results. Production deployment, SSO, delegation, payments and notifications are out of scope; app-level audit history is not database-admin tamper-proof.

No real business records, secrets or original confidential exercise brief are included. AI authorship and actual verification are recorded in [AI-USAGE.md](AI-USAGE.md).

Same-version editable patches use last-writer-wins; revisions guard changes across submitted versions. Lists are unpaginated for synthetic data. SQLite contention returns 409/reload. API returns delayed/self-assignment flags; frontend/filter work remains pending. Audit and snapshots are append-only through the API, not database-admin-proof.

Candidate accepted the documented identity, single-role, concurrent-edit/test-coverage and app-level audit limitations for this exercise only under ADR-013. Production readiness is not claimed. Exact-scenario and concurrency coverage gaps remain tracked for [final integration testing](docs/milestone-2-review.md#candidate-acceptance-and-deferred-integration-checks).
