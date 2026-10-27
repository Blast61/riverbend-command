# Engineering Operating Procedure — Riverbend Command

## Objective
Demonstrate business analysis, engineering judgment, and competent AI-assisted delivery in an approximately four-hour exercise: a working, testable purchase-exception application with role-specific views, approval chain, timeline, and append-only audit log.

## Governance
**Approved decisions are constraints**, not open invitations for the agent to redesign. User owns changes to accepted decisions. Codex is a collaborator and implementer, not the final decision-maker.

### Decision exploration protocol (material decisions only)
1. **Decision needed:** scope and business/technical consequence.
2. **Existing constraints:** cite relevant ADR/acceptance criterion.
3. **Recommended approach:** clear, falsifiable reasoning.
4. **Alternative(s):** only if technically credible, compare equal-quality approaches, including maintenance, testing, complexity, four-hour fit, risks, and reversibility.
5. **User selection:** stop and ask candidate to select/modify/reject. No auto-selection.
6. **Record:** update decisions and AI-USAGE promptly, distinguishing candidate choice from agent suggestion.

Do not generate fake A/B choices. If evidence clearly favors one solution, justify it; pause only if it changes an accepted decision or introduces material risk. Do not seek permission for ordinary mechanical details.

## Execution gates
**Gate 0 — Orientation:** Read all guidance files; identify completed vs missing repo content and existing dependencies; no guesses about code that exists. State a short plan and assumptions.

**Gate 1 — Requirements and domain:** Check acceptance criteria, seeded roles and identity boundary, dollar thresholds, versioning and self-approval; flag contradictions before implementation.

**Gate 2 — Functional vertical slice:** DB schema/migrations/seed, server endpoints, business policies, transactional audit trail; tests for routing boundaries, actions, role denial, and revision history. Demonstrate API/database behavior before visual polish.

**Gate 3 — UI:** Role switcher, submission flow, request list with filters/current approver, details with compact timeline and audit events, role-specific action controls, 72-hour aging badge.

**Gate 4 — Review:** Test negative cases and API authorization, manual role-switch walkthrough, verify persisted state across refresh, assess scope and potential security flaws. No fake screenshots, metrics or test claims.

**Gate 5 — Handoff:** README with exact local commands, documentation consistent with implementation, candid limitations, prompts and mistakes in AI-USAGE, and optional walkthrough plan.

## Working cadence
- At each gate: **what was built**, **what was tested**, **what remains**, **which changes would require a decision**.
- Prefer the smallest coherent increment; avoid sweeping refactors while functionality is incomplete.
- Run commands and inspect errors rather than assuming success.
- If blocked, try one bounded diagnosis, then explain the blocker and propose legitimate options.
- Do not use paid services, real procurement data, or confidential materials.
- Maintain clean git diffs and descriptive commits when practical.

The approximately four-hour scope is a planning constraint. Work occurred across multiple focused sessions; active time was not measured and elapsed timestamps do not establish a four-hour total.

## Four-hour scope policy
**Must work:** submission, amount routing, manager/director/VP actions, mandatory rejection rationale, return and resubmit, audit history, read-only finance, requester/approver screens, status/current owner filters, essential automated tests.
**Nice to have:** aging indicator, polished timeline, dashboard metrics.
**Cut first:** notification system, calendar/schedules, delegation automation, export, advanced analytics, production SSO, deployment, elaborate animations.

## Honesty contract
AI-USAGE records *what really happened*. AI-generated code is credited to AI, and candidate decisions/tests/corrections are credited to the candidate. An elegant paper design isn't evidence of running functionality. Don't claim an audit trail is tamper-proof against DB administrators. Report remaining gaps explicitly.

## Post-implementation walkthrough readiness
Engineer should be able to explain request states, stage assignment, failure modes, auth boundary, transactionality, schema, and how to add a new approval stage; keep that change localized and covered by tests.
