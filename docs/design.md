# Riverbend Command — Design Note

## Architecture
React/Vite + TypeScript + Material UI client ↔ Node/Express + TypeScript API ↔ SQLite via Prisma. Zod at API boundaries. Domain service owns routing/permissions and transactionally records actions and audit entries. Demo user selection is **not secure authentication**: use a well-defined identity adapter, suitable only for a synthetic demo.

## Data model (conceptual)
- `User`: id, name, department, roles, managerId (or explicit reporting hierarchy). Finance-view scope independently determined from approval authority.
- `PurchaseRequest`: id, requesterId, vendor, amountCents, reason, status, version, activeStageId nullable, submittedAt, updatedAt.
- `ApprovalStage`: id, requestId, requestVersion, ordinal, roleRequired, assigneeId, status (`WAITING`, `PENDING`, `APPROVED`, `SUPERSEDED`), activatedAt, decidedAt, decisionComment. Add unique(requestId, version, ordinal).
- `AuditEvent`: id, requestId, version, actorId or SYSTEM, action, priorState, nextState, details JSON, occurredAt, immutable through application API.

Use transactions to update request + stage(s) + append events. Review one-to-one active-stage rule and ensure stale version stage actions fail.

## Request states and actions
- `DRAFT`: editable by owner; `submit` → `PENDING_APPROVAL` (new version and stages).
- `PENDING_APPROVAL`: active assigned approver may `approve` → next pending stage or `APPROVED`; `reject` with comment → `REJECTED`; `request_changes` with comment → `CHANGES_REQUESTED`.
- `CHANGES_REQUESTED`: requester can edit and `resubmit` → `PENDING_APPROVAL` with new version and stages. Preserve historical stages/events; do not mutate old decisions.
- `APPROVED` and `REJECTED`: terminal in MVP. Finance only views; no action.

No general edit route for submitted requests. Do not overwrite historical data without emitting audit events. When resubmitting, previous stages are retained (uncompleted stages superseded). Approvals from previous versions are never reused.

## Routing policy
- 1–99,999 cents: MANAGER.
- 100,000–999,999 cents: MANAGER → DIRECTOR.
- 1,000,000+ cents: MANAGER → DIRECTOR → VP_FINANCE.
- A request owned by a designated approver cannot be approved by its owner; treat unresolved conflict as blocked, not skipped.

## API sketch (names may be adjusted without changing semantics)
- `GET /api/demo-users` seeded demo identities and roles.
- `GET /api/requests?q=&status=&approverId=` role-scoped list with current owner and aging.
- `POST /api/requests` create draft or submit directly; document behavior in README.
- `GET /api/requests/:id` request, versioned stages, audit trail; scoped by identity.
- `PATCH /api/requests/:id` edit draft or CHANGES_REQUESTED as owner.
- `POST /api/requests/:id/submissions` initial submit / resubmit.
- `POST /api/requests/:id/approvals` with validated `decision` (`APPROVE`, `REJECT`, `REQUEST_CHANGES`), `stageId`, and conditional required `comment`.

First slice: `POST /api/requests` submits directly, creating version 1 and its route atomically. Draft editing, repeat submissions, and approval actions follow in the next slice; their endpoints are not claimed as implemented yet.

Demo user identity should be injected through one adapter (e.g., `X-Demo-User-Id` header only in demo builds). Make clear that a user-controlled header cannot be used as production authentication. All mutation endpoints verify permissions server-side.

## UI layout
Role/user switcher with clear demo-mode banner; summary tiles for relevant role; searchable/filterable request table showing vendor, amount, status, active assignee, age; detail panel with chronological compact stage timeline and audit events; approval actions only for active authorized persona; requester edit/resubmit form.

## Automated tests
Priority: routing boundaries, manager→director→VP progression, no out-of-order approvals, self-approval denial, finance denial, mandatory rejection/comment, resubmit new version preserving old history, atomic audit record, role visibility, stale stage. Use isolated temporary test DB / transactions so tests are repeatable.

## Risks and limits
MVP not production auth, data-retention system, delegation workflow, or enterprise security boundary. App-level append-only audit is not database-admin-proof. Enforce concurrency safety for double actions where feasible with transactions and conditional status/version checks. If implementation constraints require a simplified concurrency story, document honestly.

## Milestone 1 review
The identity adapter resolves a database actor; the domain service accepts that actor explicitly and sets requester/audit identity itself. Future Entra integration must validate tokens and map external identity to this local actor; neither is implemented. Current single-role storage covers demo personas, not independent multi-role grants. Submission writes and audit share one transaction; tests force both late-stage and audit failures to verify rollback. See [review](milestone-1-review.md) for security/dependency findings and scope limits.
