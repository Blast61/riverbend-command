# AI-USAGE — Riverbend Command (living record)

> Complete this with actual events during implementation. Do not fabricate prompts, failures, elapsed time, or test outcomes. The candidate directs engineering decisions; Codex may generate most of the code.

## Pre-implementation planning — 2026-10-26
**Tools used:** ChatGPT for requirements interpretation, ideation, decision exploration and handoff documentation. Codex chosen for implementation because candidate has used it in prior engineering workflows (not yet invoked for this repository at time of this entry).

**Process:** Read the four-page fictional Riverbend brief; identified ambiguity in thresholds, order, revision handling, delegation, self-approval, and finance permissions; candidate emailed recruiter. Jen responded that candidate can make and document choices. Considered three products: Riverbend Flow (timeline-first), Riverbend Command (operations-first), and Riverbend Ledger (audit-first). Candidate explicitly chose a hybrid: Riverbend Command with compact approval timeline and append-only audit history.

**Candidate judgment:** Candidate wanted to avoid repeating an earlier ShiftFlow pattern where an agent provided a single architecture suggestion for approval, leaving little room for genuine design participation. Requested defensible tradeoff comparisons without fake bad options. Accepted the decision/context documents and authorized implementation. Current approved baseline is logged in `DECISIONS.md`; the assistant proposed much of the structure, and the candidate reviewed/approved it.

**Prompts represented:** Candidate: “I like this direction and let's go with your hybrid approach of Riverbend Command with a compact approval timeline and an append only audit history.” Candidate: “I don't want to leave gaps for allowing the agent to suggest intentionally poor options ... but I do want it to feel more collaborative.” Candidate: “I've overlooked [reviewed] the two documents you generated, looks good to me. I'm ready to start.” [Note: these are selected relevant excerpts, not the complete chat transcript.]

**Important correction:** Recruiter did not specify exact thresholds or workflow semantics; all numerical and business-policy choices in requirements are stated as demonstration assumptions.

## Implementation log (append real entries)
| When / phase | Tool + prompt excerpt | AI output and actions | Candidate review/decision | Verification / correction |
|---|---|---|---|---|
| 2026-10-26 / orientation and first backend slice | Codex; “Read and execute the instructions in the referenced file”; FIRST_CODEX_PROMPT requests schema, seed, submission, routing, atomic audit and boundary tests | Read all baseline files; recorded resource endpoint ADR-006 and moved unchanged collaboration contract to ADR-011; generated package setup/lockfile, Prisma model/migration/seeds, API/identity/domain modules, 17 tests and README | Candidate supplied approved rules, stack and endpoint selection; no later code review or manual candidate test claimed | Typecheck passed; 17/17 tests passed after socket permission; live health/users/submission verified and separate DB query confirmed persistence |

## Authorship and review
- **AI-generated:** Planning draft structures and proposed ADRs, requirements/design/EOP scaffolding. Record which source files Codex later generates or edits.
- **Candidate-led:** Stakeholder questions, chosen hybrid concept, final business decisions approved after review, testing and review decisions actually performed (update as work happens).
- **Hand-written/heavily edited:** To be determined and described truthfully after implementation.

## Prompts that did not work and fixes
Record at least one actual example if one occurs. If none occur, do not invent one; describe a real prompt refinement or unsuccessful direction encountered.

## Time/efficiency assessment
Record actual focused time and a candid estimate of acceleration and overhead. Time not yet measured.

## Scope cuts / limitations
Initial planned exclusions: real SSO, delegated approval, real ERP/payment integration, notifications, production deployment, production-grade audit tamper resistance. Update to reflect what was actually shipped.

## First slice execution notes — 2026-10-26
- AI generated all implementation and tests in `server/`, `prisma/`, package/config files, and documentation updates. Candidate has not yet accepted or reviewed this code in this session. No commit or publication performed.
- Real corrections: initial dependency choices (Zod 3 and Vitest 3) produced advisories; upgraded to Zod 4.6.7 and Vitest 5.0.5. Four high Prisma CLI-chain advisories remain; no forced Prisma major upgrade. Initial npm install could not resolve registry within sandbox, so retried with permission. Initial HTTP tests had 16 failures due to sandbox loopback denial (one pure domain test passed); rerun outside sandbox passed 17/17. tsx seed likewise needed IPC permission. Initial migrate on nonexistent SQLite file returned an uninformative schema-engine error; creating the empty file then migrating succeeded. These were execution/environment corrections, not invented failed user prompts.
- Representative implementation direction: candidate explicitly selected resource-oriented approvals/submissions endpoints and instructed documenting ADR-006 before implementation. Existing ADR-006 numbering collided; AI relabeled the unchanged collaboration contract ADR-011 and recorded the collision.
- Actual checks: generated Prisma client and initial migration; applied migration to local demo SQLite; seeded five synthetic users; TypeScript check passed; latest full suite 17/17 passed. Live server returned health 200, five demo identities, and submission 201 with three ordered stages/one audit event. A new Prisma client separately read the persisted request, stages and audit.
- The rollback test deliberately causes an audit insert failure using a temporary SQLite trigger; verifies no request/stage/event survives. Temporary test database is isolated from demo data. No UI or approval/revision tests claimed.
- Time was not tracked with a dedicated timer; no measured time savings or monetary cost is asserted. AI accelerated initial code/test scaffolding; dependency and sandbox setup added overhead. The four-hour plan is an estimate, not actual completion time.
- Remaining: approval transitions/authorization, request reads and filters, editable versions/resubmission, UI and aging, final role walkthrough. Full MVP acceptance criteria have not yet been satisfied.

## Milestone 1 focused engineering review — 2026-10-26
- Candidate prompt: “Before committing Milestone 1, perform a focused engineering review.” Requested dependency/security, identity, transactions, exact thresholds, Git hygiene and honest validation; explicitly prohibited committing before approval and starting Milestone 2.
- AI reviewed all source, schema/migration, tests, configuration and proposed file inventory; queried npm audit/release metadata and maintainer advisories. Found that four high entries represented two issues with inherited parent findings. Corrected the earlier omission of a non-breaking patch: upgraded Prisma/Client to 6.19.3, resolving Effect. Three high entries remain due to deepmerge-ts; optional CLI peer means production-only npm audit still includes them. No breaking upgrade/override or `audit fix --force` performed. Detailed evidence and risk recommendation in `docs/milestone-1-review.md`; no candidate acceptance of this specific advisory invented.
- AI strengthened tests: assert requester and assignee IDs at every threshold, force a later-stage insert failure, and test the SQL amount constraint. Production authorization workflow was not expanded. Reviewed centralized header adapter, payload identity rejection, explicit domain actor and future Entra mapping requirements.
- Actual validation: `npm run db:generate` succeeded after initial sandbox cache permission denial; `npm run typecheck` passed without diagnostics; `npm test`: 19 passed, 0 failed. Fresh full and production-only audits exit 1 with three high entries. Prisma warns about package.json seed config deprecation. Migration and seed verification results are in the review. No live UI/SSO/full-authorization validation claimed.
- Git review: inspected status, all tracked/untracked intended files and diffs; scanned credential patterns (no matches), inspected lockfile URLs (public registry/no embedded credentials). Expanded ignore rules for additional SQLite sidecars, logs/cache/temp/build metadata. Existing guidance/EOP/requirements remain tracked. No staging or commit. Candidate review remains pending. No measured savings/cost or fabricated corrective user prompt claimed.

## Milestone 1 candidate acceptance and commit preparation — 2026-10-26
- Candidate: “I've reviewed the Milestone 1 validation report and approve the implementation for commit.” Explicitly accepted the three documented Prisma-chain advisories for the local, time-boxed prototype based on current analysis and no identified submission API execution path; explicitly excluded production deployment.
- AI recorded this candidate-owned decision and limits as ADR-012 in `DECISIONS.md` and cross-referenced it in the review. Candidate authorized commit message: `feat: establish purchase request submission and approval routing foundation` and required checking staged files for credentials, SQLite databases and generated artifacts first. No new application code or Milestone 2 work in this turn; previous 19-test/typecheck results were not represented as newly rerun.
- Pre-commit staged verification passed: exactly 23 explicitly intended files; staged blobs matched reviewed working files; credential-pattern scan found no matches; `.env.example` matched local placeholders; no SQLite database, node_modules or build/runtime output staged; `git diff --cached --check` passed. Initial staging was denied Git index access by sandbox and succeeded after permission.
