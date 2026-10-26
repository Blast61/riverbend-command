# First Codex prompt — paste into a fresh Codex conversation in repository root

You are implementing the Riverbend Command AI-assisted take-home exercise with me. **Before touching code**, read AGENTS.md, EOP.md, CONTEXT_HANDOFF.md, DECISIONS.md, docs/requirements.md, docs/design.md and AI-USAGE.md, in that order. This repo contains our prior ChatGPT planning handoff; do not assume you can see that conversation independently.

I have already approved the business-rule and product baseline recorded in DECISIONS.md. Do **not** restart brainstorming or redesign the app. You may use routine implementation discretion. For material new choices or deviations from approved ADRs, follow our Decision Exploration Protocol: show a justified recommendation and only genuine alternatives (never contrived inferior options), explain tradeoffs, and stop for my decision. Do not seek my approval for trivial mechanics.

First, summarize in <=12 bullets the constraints and acceptance criteria you read, identify any contradiction or consequential blocker, and propose a 4-hour, vertically sliced implementation plan. If there is no material blocker, proceed to the first vertical slice: schema, migration, seed demo users, API submission with amount-based sequential stage routing, atomic audit event, and automated boundary tests. Run tests, report actual results, and update AI-USAGE.md truthfully with your actions and representative prompts. Make no claim of features or tests you did not implement/run. Do not copy or publish the confidential employer brief; synthetic data only.

One additional architectural decision from our planning:

We evaluated action-oriented approval endpoints against resource-oriented approval endpoints and selected the resource-oriented approach.

Use:

- POST /api/requests/:id/approvals
- POST /api/requests/:id/submissions

Approval decisions should be represented through a validated decision type in the request body.

Update docs/design.md and record this decision as ADR-006 in DECISIONS.md before implementation.

Follow the existing EOP and project guidance. Do not reopen previously accepted architectural decisions unless you identify a concrete technical conflict.

For new consequential decisions, present genuinely viable alternatives with their tradeoffs. Avoid unnecessary approval checkpoints for routine implementation details.

