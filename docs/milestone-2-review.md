# Milestone 2 engineering review — 2026-10-26

Status: candidate approved implementation for commit after engineering walkthrough; prototype-only limitations accepted under ADR-013. No frontend work performed. Validation below records the implementation phase, not new test runs during commit preparation.

## Scope and architecture

Implemented resource-oriented approval decisions, owner-only edits/resubmissions, immutable submitted revision snapshots, shared backend permission/read-scope policies, strict query/body validation and role-scoped lists/details. Existing M1 direct submission and amount policy remain; route creation was extracted solely to share identical behavior with resubmission. Identity remains a centralized demo adapter and can be replaced through an injected resolver. No new dependency or change to accepted stack/business thresholds.

The candidate's latest instruction explicitly specifies decision values `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`; these replace earlier design sketch verbs. Routes retain ADR-006's `:id` segment despite the prompt's omitted ID placeholders. No consequential unresolved architecture choice was identified. Implementation details and endpoint bodies are in [design](design.md).

## Executed checks

- `npm run db:generate`: generated Prisma Client 6.19.3.
- `npm run typecheck`: final run passed, exit 0/no diagnostics.
- `npm test`: final run **60 passed, 0 failed, 3 test files** (19 M1, 40 workflow/read tests, 1 actual migration deployment test).
- `DATABASE_URL=file:./dev.db npm run db:migrate`: applied the additive workflow migration to existing local synthetic data successfully.
- `DATABASE_URL=file:./dev.db npm run db:seed`: succeeded with five synthetic users.
- The migration test invokes Prisma `migrate deploy` for M1-only installation, M1 upgrade, repeat deploy and fresh installation; it checks snapshot backfill, unchanged audit/stage identity and seed idempotence. Test databases are isolated temporary files, removed afterward.
- `DATABASE_URL=file:./dev.db npm run start:server`: started backend. Live Node/fetch assertions exercised direct submission, finance denial, manager approval, director return, owner edit/resubmission, stale-stage denial, all three new approvals and finance filtered/detail reads. Final state APPROVED/version 2 with 2 snapshots, 6 stage rows and 8 audit events. Both submitted amounts remained present. After stopping the server, a separate Prisma process confirmed the same persisted status/version, snapshots, stages and audit counts. This is an API walkthrough, not candidate manual testing or UI verification.
- `npm audit --json`: exit 1, **same three high entries** for `deepmerge-ts`, `@prisma/config`, `prisma`; no new moderate/critical entries. Package manifest/lockfile unchanged. ADR-012's local-only acceptance remains scoped to the synthetic prototype; no new user-controlled config or affected config-merging API was introduced.

Warnings/corrections: Prisma continues to warn about package.json seed configuration deprecation. First TypeScript run caught two test helper arguments typed `unknown` rather than Supertest's accepted object; AI corrected them. First 57-test run passed; subsequent migration/identity/body-parser checks expanded it to 60, which passed. Review identified the existing 16KB body-limit error returning 500; corrected to 413 and added coverage. No test failure or candidate corrective prompt was invented.

## Integrity and permission review

Every domain mutation uses one interactive transaction and its transaction client: initial submit, edit, decision and resubmit all append audit inside the same boundary. Immutable submitted snapshots are inserted in the submit/resubmit transaction. Conditional status/version/stage claims prevent duplicate successful actions; concurrent duplicate decision/resubmit tests allow exactly one success and one 409.

Failure-injection tests cover initial stage/audit insertion, each approval decision's audit insertion, next-stage activation, edit audit and resubmission audit. They assert previous request/stage/history values survive unchanged with no partial new version/route/audit. Missing hierarchy on resubmission also rolls back. These tests verify application transaction behavior; they are not power-loss or broad deployment concurrency tests.

Backend verifies actor ownership/role/current assignee and stage/version/state, not UI controls. Tests include unrelated/wrong-role/out-of-order approvers, assigned qualified owner self-approval, finance writes, pending/terminal edits, required comments, stale/foreign IDs, old revision resubmissions, increased/reduced amounts, preserved approved/returned stages and audit records, query scope intersections, malformed queries and hidden details. The injected-identity test proves header selection cannot override a trusted resolver. Actual Entra integration remains unimplemented.

## Remaining limits

- No frontend, production authentication/hosting, delegated resolution, notifications or multi-role user grants. Only existing drafts can be edited/submitted; direct request creation still submits immediately.
- Approvers read own requests plus their current queue. Former assignees retain no special history access; owners and finance retain it.
- Same-version editable-field patches use last-writer-wins; successful patches are audited. Expected version guards prevent edits/submissions from an older submitted revision. There is no same-version form concurrency token.
- SQLite contention can return 409 requiring reload; no implicit mutation retries. No multi-process load or crash-recovery benchmark performed.
- Audit/revision rows are protected by application API scope, not against database administrators; domain code enforces cross-row workflow invariants.
- No pagination; demo dataset only. Delayed flag is returned by API, but aging UI/filter is not implemented.
- Three known dependency entries remain accepted only for the local prototype; production requires reassessment.

Final Git review: exactly 21 intended modified/new source, migration, test and documentation files. No credential-pattern matches, secret envs, local database files or generated/dependency directories in the proposed project inventory; `.env.example` remains placeholders only. Existing ignores cover runtime artifacts. Manifest/lockfile unchanged. `git diff --check` and whitespace checks including new files passed. This inspection preceded candidate approval; commit preparation repeats staged-content and whitespace checks. Further details are recorded in AI-USAGE.

## Candidate acceptance and deferred integration checks

Candidate explicitly accepted demo authentication, single-role identities, last-write-wins edits to the same editable request, limited concurrent-decision coverage, and application-level audit immutability for this local, time-boxed exercise only (ADR-013). None should be represented as production-ready behavior. No code was changed during the subsequent walkthrough/commit preparation.

Preserve these gaps for the final integration-testing milestone; they are not completed checks:

- One exact end-to-end case: $14,000 submission, manager approves, director requests changes, owner changes to $800, resubmits version 2, manager-only route completes, old snapshots/decisions/audit remain intact. Current tests cover these components with different amounts/return stages.
- Competing decision values on the same stage, such as approval versus rejection/return. Current concurrent-decision test sends two identical approvals through the same app/client setup; it does not establish all conflicting-decision or multi-process outcomes.
- Simultaneous same-version edits and edit/resubmission interactions. Confirm overlapping-field last-write-wins and audit behavior without claiming stale-form prevention. Expected submitted version does not change on patches and does not protect against stale content within an editable version.

SQLite contention can cause failures; only selected Prisma transaction codes map to 409, while other unexpected errors return 500. No guarantee that one request always succeeds under every load/failure condition is claimed.


## Milestone 4 follow-up (supersedes deferred-test status above)

The exact lifecycle, competing approval/rejection, stale same-version form overwrite and two overlapping same-version patches are now covered by four executed regressions in `server/tests/workflow.test.ts`. The final suite passes 93/93; see [submission review](milestone-4-submission-review.md) for scope and results. Edit/resubmission interaction, multi-process contention and load/crash recovery remain untested. Historical M2 results above are unchanged; this is no stronger production concurrency guarantee or change to ADR-013.
