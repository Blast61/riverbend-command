# Riverbend Command — Design Note

## Architecture and identity

React/Vite + TypeScript + Material UI client ↔ Node/Express + TypeScript API ↔ SQLite via Prisma. Zod schemas in `server/src/validation.ts` validate strict mutation bodies and list queries. `authorization.ts` owns role/ownership checks and the shared read-scope predicate. Domain services own transitions and transaction boundaries; HTTP handlers resolve identity and call them.

`createApp(db, resolveIdentity)` defaults to the centralized `demoIdentity` adapter. `X-Demo-User-Id` selects a seeded database user; it is **not production authentication**. A future trusted resolver must validate Entra tokens and map tenant/object identity to a local actor; domain services continue accepting the resolved actor. Integration is not implemented. The current single-role field models the five demo personas, not independently assigned multi-role grants.

## Persistence

- `User`: id, name, department, role, managerId. The reporting chain supplies stage assignees.
- `PurchaseRequest`: current vendor/amountCents/reason, requesterId, status, submitted version, activeStageId, submittedAt/updatedAt. Current fields are editable only while draft/returned; they can differ from the last submitted snapshot until resubmission.
- `PurchaseRevision`: immutable submitted vendor/amountCents/reason/submittedAt snapshot, keyed by `(requestId, version)`. Every submission creates a fresh row. No snapshot mutation API exists.
- `ApprovalStage`: request/version/ordinal, role and assignee, status (`WAITING`, `PENDING`, `APPROVED`, `SUPERSEDED`), activation/decision timestamps, decision/comment. Unique `(requestId, requestVersion, ordinal)`.
- `AuditEvent`: request/version, actor, action, prior/next request state, JSON-serialized details, timestamp. No update/delete API. Details include decision/stage/comment or purchase snapshots/edit deltas.

A decided stage keeps its explicit decision (`APPROVED`, `REJECTED`, `CHANGES_REQUESTED`). To retain ADR-008's stage statuses, rejection/return closes its stage as `SUPERSEDED` with decision/comment/time; untouched future stages become `SUPERSEDED` without a decision. Prior `APPROVED` stages and all old decisions/events remain preserved. New versions always restart at manager.

## Workflow and transactions

- Direct creation submits version 1 and creates its route, snapshot and audit in one transaction.
- Only the current assigned approver with the matching role may act on a pending stage of the current version. Owner/self-approval and finance-only actions are denied server-side.
- `APPROVED` marks the stage approved and activates the next stage, or completes the request. Next-stage aging starts at activation, not initial submission.
- `REJECTED` requires a trimmed nonblank comment and is terminal. `CHANGES_REQUESTED` also requires a comment and returns editing control to the requester. Both clear the active stage.
- Only the owner may patch `DRAFT`/`CHANGES_REQUESTED`. Patch accepts purchase fields only, plus expected `version`; it records `EDITED` with previous values and changes. Editing does not itself advance submitted version or mutate a submitted snapshot.
- `POST .../submissions` requires expected version, increments it, recalculates route from current amount and creates a new snapshot/audit. For an existing version-0 draft this creates version 1. There is no draft-creation endpoint; `POST /api/requests` keeps M1's direct-submit behavior.
- Stale/foreign/duplicate stage IDs and stale submission versions are rejected. No API reuses old approvals or permits pending/terminal purchase edits.

All mutations use one Prisma interactive transaction, including stage changes and audit insertion. Conditional request/stage updates claim the expected status/version/active stage. SQLite serializes writes; lock/transaction contention maps to 409 rather than silently replaying an action. Reload before retrying. Tests exercise simultaneous same-stage decisions and simultaneous resubmissions. Broader multi-process load/power-loss testing is not claimed. Concurrent edits within the same editable version use last-writer-wins; the audit records each successful patch. There is no edit-generation token for same-version forms.

## Routing and read scope

- 1–99,999 cents: MANAGER.
- 100,000–999,999 cents: MANAGER → DIRECTOR.
- 1,000,000+ cents: MANAGER → DIRECTOR → VP_FINANCE.

Thresholds remain in `policy.ts`. `workflow-store.ts` shares route creation between initial submission and resubmission. Missing/wrong-role reporting configuration returns 409, with rollback. Self-assignment is flagged as `blockedAssignment` and cannot be acted on; it is never silently skipped.

Lists and details use the same scope: own requests, plus currently assigned pending requests for approver roles; finance-only users can read all. Future/unrelated/past assignees receive no additional read access. Once a non-owner approver advances a request, it leaves their queue and subsequent detail access; the mutation response still contains the action result. Hidden/missing details return 404. Filters are intersected with scope and never widen it.

List/detail include current stage/assignee and derived `blockedAssignment`/`delayed` (>72 elapsed hours) flags. Details additionally include all versioned stages, immutable snapshots and chronological audit with actors. Lists omit history for compactness. Search is substring matching with SQLite's collation behavior; list results are unpaginated for the small synthetic dataset.

## Implemented API

All request endpoints require a resolved actor; liveness and demo user enumeration are public in this local demo.

| Method/path | Body/query | Result |
|---|---|---|
| `GET /api/health` | — | Liveness |
| `GET /api/demo-users` | — | Synthetic personas |
| `POST /api/requests` | `{vendor, amountCents, reason}` | 201; submitted request/version 1 |
| `GET /api/requests` | optional `q`, `vendor`, `status`, `approverId` | Scoped array; current stage and assignee |
| `GET /api/requests/:id` | — | Scoped detail, snapshots, stages and audit |
| `PATCH /api/requests/:id` | `{version, vendor?, amountCents?, reason?}`; at least one purchase field | 200; owner-only editable request |
| `POST /api/requests/:id/submissions` | `{version}` | 201; fresh submitted version and route |
| `POST /api/requests/:id/approvals` | `{stageId, decision, comment?}` | 201; atomic decision and resulting workflow |

Decision values are `APPROVED`, `REJECTED`, `CHANGES_REQUESTED` per the candidate's Milestone 2 instruction. Comments required for the latter two. Unknown fields and malformed/repeated query parameters are rejected; IDs and text are length-limited. 400 validation, 401 missing/unknown identity, 403 forbidden, 404 missing/hidden detail, 409 stale/state/configuration/contention conflict, 413 oversized body; unexpected failures return generic 500.

## Migration and verification

`202610260002_workflow` adds `ApprovalStage.decision` and `PurchaseRevision`, backfilling current submitted snapshots from M1 rows. M1 had no edit endpoint, so its stored purchase fields are the version-1 submission. Original migration, stage IDs and audits are retained. Run normal `npm run db:migrate` and `npm run db:seed`; do not reset existing demo data. The migration suite deploys real Prisma migrations against both fresh SQLite and an M1-populated database and checks backfill/history preservation and idempotent seeding.

Automated tests cover routing boundaries, sequential/final decisions, required comments, roles/ownership/self-approval, stale IDs/versions, editing rules, upward/downward rerouting, immutable revisions/history, read scopes/filters, injected identity, concurrent duplicate actions and forced stage/audit failures. See [Milestone 2 review](milestone-2-review.md) for actual execution results.

## UI and limitations

ADR-014 frontend is implemented: unified role-relevant workspace, demo banner/switcher, scoped queue/search/filters, real-data summaries, contextual detail/timeline/audit and forms consuming server action flags. No delegation, notifications, real payments or production hosting.

App-level append-only audit/snapshots are not database-admin-proof. Cross-row state invariants rely on domain transactions rather than arbitrary SQL protection. Single-role users, explicit seeded reporting hierarchy, unpaginated lists and caller-controlled demo identity remain limitations. Three dependency audit entries are accepted only for the local prototype under ADR-012; [M1 security review](milestone-1-review.md) retains the dependency analysis.

## Candidate acceptance and integration follow-up

ADR-013 records explicit candidate acceptance of demo authentication, single-role identities, last-write-wins same-version editing, limited concurrent-decision test coverage, and application-level audit immutability for the exercise only. These are not production-ready guarantees. The [review's deferred integration checks](milestone-2-review.md#candidate-acceptance-and-deferred-integration-checks) preserve the exact $14,000-to-$800 director-return scenario, mixed-decision concurrency and simultaneous-edit/edit-submission cases for final integration testing; they have not been validated as exact scenarios yet.

## Frontend organization and additive API metadata — Milestone 3

`client/src/api.ts` owns real HTTP requests, identity headers and API error decoding; `types.ts` defines transport shapes; `useWorkspace.ts` loads rows/details and aborts/discards stale responses. React components display data and collect input. Backend remains the policy boundary: `authorization.ts` shares the editable-state guard with mutations and derives request `permissions: {canEdit, canResubmit, canDecide}`. User enumeration adds `permissions: {canCreate, canReview, canViewAll}` for navigation. All request read/mutation responses carry per-actor action flags; they are advisory presentation metadata, never client-issued authorization. Existing mutation checks and transaction bodies remain authoritative.

One root package provides Vite (loopback 5173) with `/api` proxy to loopback 3001; no CORS dependency or backend static-serving change. Build outputs to ignored `dist/client`; optional preview uses loopback 4173 and the same API proxy. Backend and client have separate TypeScript configurations; `npm run typecheck` checks both. Vitest includes existing API/migration tests plus jsdom frontend tests.

Views select own/assigned/company subsets of the real API-scoped dataset. Metrics show pending count/value, returned count and server-delayed count for the view before search filters, and show unavailable markers while loading/on failure. Search includes vendor/full/display ID; status/current-approver/aging filters are local presentation filters over permitted records. This retains current small-data/unpaginated behavior. Current and historical timeline states come from persisted stages/decisions, not client routing calculations. The drawer exposes revision snapshots and chronological audit comments; mutations refresh server data. Forms keep input on failure; no optimistic fake approval state is used.

Only selected demo user ID is stored locally; selected request ID is in the URL and is re-authorized/refetched on refresh. Role changes clear old context and abort reads. Edit forms snapshot the persisted version; save and resubmit are separate explicit operations. Approval dialogs send persisted activeStageId and required explanation. Backend errors remain visible, and stale workflows require reload rather than automatic retry. Existing drafts can be edited if returned by the API; creation still submits directly.

Responsive sidebar, scrollable queue, contextual Material UI drawer/dialogs, labeled controls, keyboard-accessible buttons, text+color status indicators, semantic headings, skip link and reduced-motion treatment are included. Actual layout/browser checks and accessibility warnings are documented in [Milestone 3 review](milestone-3-review.md); no formal accessibility certification claimed. ADR-013's deferred final integration cases remain pending.

### Overlay focus lifecycle correction

`overlayFocus.ts` captures/blurs the active trigger before a form/drawer opens, then restores it after unmount/exit. Restoration never moves focus behind a still-active parent overlay; disconnected triggers fall back to the workspace. Cleanup checks the removed node to avoid StrictMode rehearsal cleanup stealing focus. Material UI focus trapping remains enabled. Three targeted tests and bounded native Chrome open/close checks support this correction; it does not change backend behavior or establish full accessibility compliance. Candidate walkthrough: [UAT worksheet](milestone-3-uat.md).
