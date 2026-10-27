# Riverbend Command — Engineering Decision Log

Status: Milestones 1–3 committed; Milestone 4 verification complete, final review pending | 2026-10-26

## Source and constraints
- DH Pace fictional Riverbend Supply Co. AI-Assisted Build Exercise: ~4 focused hours; working UI, API, DB, tests; README, docs/requirements.md, docs/design.md, AI-USAGE.md, and project-level AI guidance file.
- Stakeholder questions sent through recruiter. Jen replied that business-rule decisions are up to the candidate; document reasonable choices and proceed.
- Use only synthetic data. No confidential employer information. No paid tools necessary. Do not publish original brief.
- Product direction: Riverbend Command, an operations dashboard with compact approval timeline and append-only audit history.

## ADR-001 — Product direction (ACCEPTED)
Decision: Enterprise purchase-exception command center with role-specific views, request list/search, aging indicators, request detail with approval timeline, append-only audit history.
Alternatives: timeline-first Riverbend Flow; ledger-first Riverbend Ledger.
Rationale: Maximum operational visibility and demonstration value per hour.
Tradeoff: No elaborate freeform graph or extensive analytics.

## ADR-002 — Approval thresholds (ACCEPTED — candidate reviewed 2026-10-26)
Decision: Sequential stages: amount < $1,000 manager; $1,000 to < $10,000 manager then director; >= $10,000 manager then director then VP Finance. Exact $1,000 and $10,000 fall in upper tiers. Amount in integer cents.
Alternatives: parallel approvals; different amounts.
Rationale: transparent, testable, matches vague stakeholder hints; $14,000 story traverses all levels.
Tradeoff: slower than parallel route. Centralize thresholds as domain policy; do not place in UI.

## ADR-003 — Revision policy (ACCEPTED — candidate reviewed 2026-10-26)
Decision: Edits only in DRAFT or CHANGES_REQUESTED. On resubmission, increment request version, recalculate approvals, restart from manager; preserve historical actions, never erase prior approvals.
Alternatives: selectively preserve approvals.
Rationale: each approval applies to an immutable submitted version; simplifies correctness.
Tradeoff: repeated reviews on minor edits.

## ADR-004 — Roles and access (ACCEPTED — candidate reviewed 2026-10-26)
Decision: Seeded demo users; backend authorization separates requester, assigned approver, and read-only Finance Operations. Self-approval always blocked server-side. Build a user identity boundary so eventual Entra ID sign-in can replace demo identity without changing domain policy.
Approver absent: highlight aging requests, no automatic reassignment in MVP. Self-approval conflicts: block and flag for administrative resolution rather than silently skip a stage; seed demo scenarios without conflicts.
Alternatives: delegation and automatic escalation.
Tradeoff: cannot resolve every exceptional case without future work.

## ADR-005 — Audit history (ACCEPTED — candidate reviewed 2026-10-26)
Decision: Append-only AuditEvent rows (request ID, actor, event, timestamp, previous/new state, comment/metadata, request version). No normal update/delete API. Persist business mutation and audit event in one DB transaction.
Alternatives: simple mutable last-updated fields; full event sourcing.
Rationale: reliable reconstruction without overbuilding.
Tradeoff: cannot claim database-admin-level tamper-proofing.

## ADR-011 — AI collaboration contract (ACCEPTED — candidate reviewed 2026-10-26)
Decision: Codex may implement routine local code details autonomously. For material decisions, it must: state a recommendation; compare 2+ genuinely defensible approaches only when tradeoffs are material; give evidence-based selection criteria; explain implications; mark reversibility/risk; and await candidate's explicit selection. If one approach dominates, say so and explain why—no fake options. The candidate may also propose a third option.
Require a running decision log and representative prompt/correction log for AI-USAGE.md. No invented failures or exaggerated human coding claims.

## ADR-007 — Stack and source organization (ACCEPTED BASELINE; verify with Codex)
Decision: React + TypeScript + Vite frontend; Node.js + Express + TypeScript API; SQLite + Prisma persistence; Zod request validation; Vitest + Supertest API/domain tests; Material UI for enterprise UI. Use a single repository with `client/`, `server/`, and `docs/`.
Alternatives: Next.js full-stack route handlers; SQL-first with better-sqlite3; Cloudflare Workers/D1 (familiar from ShiftFlow).
Rationale: familiar technology, simple local run, real persistence, easy test isolation and clear API boundary in four hours.
Tradeoff: two dev processes; Prisma migration/setup overhead. If tooling blocks progress, propose an evidenced simplification before changing stack.

## ADR-008 — Request state and stage history (ACCEPTED BASELINE)
Decision: `DRAFT`, `PENDING_APPROVAL`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED` request states. Separate stage records (`WAITING`, `PENDING`, `APPROVED`, `SUPERSEDED`) with request version. One active stage per submitted request. The approver may approve, reject (required nonblank reason), or request changes (required nonblank clarification). A rejection is terminal in MVP; a changes-requested request can be edited and resubmitted, generating a new version and stages; old stages remain for history. The requester may edit only draft or changes-requested submissions; request status and audit are immutable by normal edits.
Alternatives: calculate stages on every read; model entire workflow in one request status; event-source all state.
Rationale: straightforward assignment tracking and versioned audit, testable transitions.
Tradeoff: more persistent rows but simple domain constraints.

## ADR-009 — Aging visibility and scope cut (ACCEPTED BASELINE)
Decision: Mark `PENDING` stages older than 72 hours as delayed, based on stage activation time; show badge and filter, no escalation/delegation action in MVP. Prioritize full workflow, role security, audit, search/filter and tests over additional charts, notifications, exports, real login, or hosting.
Alternatives: calendar-day business-hours SLA, automatic delegation.
Rationale: demonstrates absence issue transparently without assuming organization calendar or authority rules.
Tradeoff: 72 hours is a demo assumption and includes weekends.

## ADR-010 — Self-approval and finance (ACCEPTED BASELINE)
Decision: finance-only demo persona can view everything, not approve; approver roles may have finance visibility only if separately authorized. A user never approves their own request, including if their other role qualifies; disallow at server boundary. If stage assignment would create self-approval, show a blocked-assignment indicator for manual resolution as an explicit MVP limitation; do not silently reroute.
Rationale: preserves compliance without inventing an alternate approval delegation policy.

## Decision change protocol
Any agent-introduced material design change gets a new ADR or explicit amendment with user approval. Never silently mark an implementation-generated suggestion as candidate decision. Record real rationale, prompts, and corrections.

## ADR-006 — Resource-oriented workflow endpoints (ACCEPTED — candidate prompt 2026-10-26)
Decision: Use `POST /api/requests/:id/submissions` and `POST /api/requests/:id/approvals`. Approval bodies carry a validated decision type. Candidate Milestone 2 instruction (2026-10-26) specifies `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`; these are the implemented values, replacing the earlier design sketch verbs.
Alternative: Separate action endpoints for submit, approve, reject, and request changes.
Rationale: Candidate explicitly selected resource-oriented endpoints in FIRST_CODEX_PROMPT.md.
Traceability: The existing collaboration contract was relabeled ADR-011 without changing its content to resolve the requested ADR number collision.

## Milestone 1 review note — 2026-10-26 (not a new ADR)
Applied routine, non-breaking Prisma/Client patch 6.19.0 → 6.19.3 after registry metadata identified patched Effect in its config dependency. No business rule or architecture change. Residual deepmerge risk and recommendation to defer a breaking migration are recorded in `docs/milestone-1-review.md`; candidate-specific risk acceptance has not been asserted. No forced fixes, staging or commit authorized by this review.

## ADR-012 — Milestone 1 residual dependency risk (ACCEPTED — candidate 2026-10-26)
Decision: Accept the three remaining documented high npm audit entries (`deepmerge-ts`, `@prisma/config`, and `prisma`) for this local, time-boxed synthetic prototype only, and approve Milestone 1 for commit.
Basis: Candidate reviewed the engineering validation report and dependency analysis after the non-breaking Prisma/Client 6.19.3 patch. The entries derive from deepmerge-ts in Prisma's configuration/tooling chain; no execution path through the current submission API was identified. The optional CLI peer remains present in npm's production dependency graph; acceptance does not mean the dependency is fixed or universally safe.
Limits: This acceptance explicitly does not extend to production deployment. Reassess before deployment, introducing untrusted configuration, or changing code/dependencies in ways that affect reachability. A breaking upgrade or override requires its own review and validation; none is authorized here.
Traceability: See `docs/milestone-1-review.md` for package paths, advisory sources, mitigation analysis and actual test results. Candidate authorized the specified Milestone 1 commit and explicitly deferred Milestone 2.

## Milestone 2 implementation trace — 2026-10-26 (no new architecture ADR)
Candidate authorized backend workflow/authorization/revisions/read endpoints and tests, with no frontend or automatic commit. Implemented accepted ADR-003/005/008 with immutable submitted snapshots, a stage decision field, transactional state/audit changes and fresh routes per version. This additive persistence work preserves M1 data; it does not change approved routing/revision policy. Query scopes implement own requests plus active assigned queue, with finance read-all. See `docs/design.md` and `docs/milestone-2-review.md` for mechanics, validation and candid limits. Candidate subsequently accepted Milestone 2 under ADR-013.

## ADR-013 — Milestone 2 prototype limitations (ACCEPTED — candidate 2026-10-26)
Decision: Approve Milestone 2 for commit with demo authentication, single-role demo identities, last-write-wins simultaneous edits to the same editable request, limited concurrent-decision test coverage, and application-level audit immutability rather than database-administrator tamper resistance.
Basis: Candidate reviewed the engineering walkthrough and explicitly accepted these limitations for the local, time-boxed exercise only. This is not production-ready identity, concurrency or audit protection. ADR-012's separate dependency-risk limits remain unchanged.
Follow-up: Preserve the exact $14,000 → manager approval → director return → $800 → resubmit → manager-only approval scenario, conflicting-decision concurrency, and simultaneous-edit testing as pending final integration checks. Existing tests do not establish those exact combined/concurrent scenarios. No stronger edit protection or production guarantee is implied by acceptance.
Scope: Candidate authorized `feat: implement approval workflow and revision history`; no Milestone 3 work is authorized by this decision.

## ADR-014 — Unified frontend workspace (ACCEPTED — candidate 2026-10-26)
Decision: A unified React + TypeScript workspace with contextual request-detail panels, rather than independent pages. Material UI provides reusable enterprise components. API communication, business data/state and presentation remain separated. No approval routing or authorization policy is duplicated in React components.
Basis: Candidate explicitly selected this architecture in the Milestone 3 prompt; implementation follows ADR-007's React/Vite/Material UI stack and retains existing backend behavior.
Implementation: The API adds per-request available-action flags derived from server authorization/state checks. Client presents these flags while mutations continue enforcing permissions server-side. Dashboard summaries derive from the actor's actual scoped API records and clearly state their scope.
Limits: Demo identity and earlier prototype limitations remain. No hosting, production authentication or general-purpose workflow editor is introduced.

## Milestone 3 acceptance — 2026-10-26 (no new architecture ADR)
Candidate personally tested submission, approval routing, requests for changes, resubmission, role switching, finance visibility and audit history; observed functionality met expectations. Candidate requested a narrow Active user label/notch correction and authorized the Milestone 3 commit conditional on successful final validation. ADR-012/013 limitations remain unchanged; exact deferred automated integration/concurrency cases are not closed by this report. Milestone 4 is not authorized.


## Milestone 4 verification trace — 2026-10-26 (no new architecture ADR)

Candidate authorized finalization/testing/documentation only, without commit/push/deploy. Added exact lifecycle, conflicting approve/reject and same-version edit regression evidence. ADR-013's requested follow-up cases are partially closed; edit/submission interaction and broader independent-process/load coverage remain deferred. No change to accepted last-write-wins, identity, audit or dependency-risk decisions. Final review records actual bounds of demonstrated behavior.
