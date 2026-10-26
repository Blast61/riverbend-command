# Riverbend Command — Engineering Decision Log

Status: Approved planning baseline; implementation not yet begun | 2026-10-26

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

## ADR-006 — AI collaboration contract (ACCEPTED — candidate reviewed 2026-10-26)
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
