# Riverbend Command

Synthetic purchase-exception approval demo. **Status: Milestones 1–3 committed; Milestone 4 engineering verification complete, final candidate approval pending. Local synthetic prototype only.**

Implemented: SQLite migrations, five seeded identities, direct submission, sequential decisions, owner-only editing/resubmission, immutable revision snapshots, role-scoped reads/search and transactional audit. React/Material UI workspace connects to the real API with requester, approver and finance experiences.

## Local run

Use Node.js 22.23.4 and npm 10.9.9 for the verified setup. Other versions were not tested. Stack: React + TypeScript + Vite + Material UI; Express + Prisma 6 + SQLite; Zod and Vitest/Supertest.

```sh
npm ci
test -f .env || cp .env.example .env
npm run db:generate
test -f prisma/dev.db || touch prisma/dev.db
npm run db:migrate
npm run db:seed
npm run start:server
```

In a second terminal:

```sh
npm run dev:client
```

Open **http://127.0.0.1:5173/**. Vite proxies API calls to port 3001. Use the demo selector to change personas. Browser refresh reloads persisted requests; only demo selection is stored locally. Both processes must be running.

Prisma loads `.env` for database commands and client initialization. API defaults to `127.0.0.1:3001`; set `PORT` in the shell to override (the Vite proxy must then be updated from 3001 as well). `touch` initializes an empty SQLite file before migration. Use `npm run dev:server` for watch mode.

```sh
curl http://127.0.0.1:3001/api/demo-users
curl -i http://127.0.0.1:3001/api/requests \
  -H 'Content-Type: application/json' \
  -H 'X-Demo-User-Id: employee' \
  -d '{"vendor":"Synthetic Supply","amountCents":1400000,"reason":"Demo replacement equipment"}'
npm run typecheck
npm test
npm run test:client
npm run build
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

**93 automated tests pass** (65 backend, 28 frontend), retaining all 60 Milestone 2 backend cases. Backend/client TypeScript and frontend build pass. Backend coverage includes decisions, permissions, revisions/history, rollback and actual migration deployment. Frontend tests cover role/permission presentation, forms/errors, exact amount conversion, timeline/history, stale reads and filters. Live Chrome checks against the real API verified submit/return/edit/resubmit/approve, rejection comments, refresh persistence, finance read-only controls and responsive basics. Detailed commands, distinctions and limitations: [Milestone 3 review](docs/milestone-3-review.md).

Engineering review patched Prisma/Client to 6.19.3, resolving the Effect advisory. Three high audit entries remain for deepmerge-ts and its Prisma/config parents; npm also includes them through Client's optional CLI peer in production-only audits. Latest audit remains unchanged at those three high entries; no dependencies changed in Milestone 2 and no forced major migration was applied. See the [Milestone 1 review](docs/milestone-1-review.md) for exposure, remediation and actual validation results. Production deployment, SSO, delegation, payments and notifications are out of scope; app-level audit history is not database-admin tamper-proof.

No real business records, secrets or original confidential exercise brief are included. AI authorship and actual verification are recorded in [AI-USAGE.md](AI-USAGE.md).

Same-version editable patches use last-writer-wins; revisions guard changes across submitted versions. Lists are unpaginated for synthetic data. Selected SQLite/transaction contention errors return 409 requiring reload; unexpected errors can still return 500. API returns delayed/self-assignment flags; the UI displays them and includes an aging filter. Audit and snapshots are append-only through the API, not database-admin-proof.

Candidate accepted the documented identity, single-role, concurrent-edit/test-coverage and app-level audit limitations for this exercise only under ADR-013. Production readiness is not claimed. Final integration tests now cover the exact $14,000/director-return/$800 lifecycle, conflicting approval/rejection and overlapping same-version edits. Edit/resubmission races and multi-process/load coverage remain deferred; see the [final submission review](docs/milestone-4-submission-review.md).

## Frontend review

Unified workspace: contextual request drawer, current/historical approval timeline, revision snapshots/audit, create/edit/resubmit and decision forms, loading/errors/retry, searchable/filterable queues and API-derived summaries. Finance has no write controls. UI action availability comes from server metadata; server authorization is still enforced. Existing drafts are editable, but no new draft-creation endpoint exists.

Summary metrics describe the selected view before filters; local filters operate only on API-permitted records. Lists remain unpaginated for demo data. Stale workflows need reload; no automatic mutation retries or client routing policy. See [architecture](docs/design.md) and [actual validation/known browser observations](docs/milestone-3-review.md). Final integration evidence and remaining gaps are recorded in the [submission review](docs/milestone-4-submission-review.md).

Build writes ignored `dist/client`. `npm run preview` serves that build on 4173 with the API proxy; the real API must also run on 3001. Production hosting is not implemented. Build reports a nonfatal >500KB chunk warning. Focused review corrected trigger focus handling and tested Escape/drawer/nested-editor restoration. Fresh observed dialog/drawer cycles had no console messages. The earlier native-input update-depth error remains unreproduced with unknown cause. This is not production accessibility certification.

Candidate completed primary-workflow manual acceptance testing and reported expected behavior for submission, routing, changes requested, resubmission, role switching, finance visibility and audit history. [The UAT record](docs/milestone-3-uat.md) distinguishes this report from automated and Codex browser checks; individual unreported checklist results remain blank. Candidate authorized the Milestone 3 commit after the Active user label correction and successful final validation.


## Demo personas and final review

| Selector identity | Role / access |
|---|---|
| Alex Chen (`employee`) | Requester; configured reporting chain |
| Sam Rivera (`manager`) | Assigned manager approvals |
| Morgan Reed (`director`) | Assigned director approvals |
| Jordan Ellis (`vp`) | Assigned VP Finance approvals |
| Taylor Brooks (`finance`) | Company-wide read-only finance |

Fresh seeding creates users, not purchases; start with Alex and New request. Seeding upserts persona configuration and can overwrite local user changes; do not seed unnecessarily. Keep existing database/configuration and never use reset to apply migrations. Required documents, traceability, fresh-copy verification and final submission checklist: [Milestone 4 review](docs/milestone-4-submission-review.md). Finalization changes remain uncommitted pending candidate approval.
