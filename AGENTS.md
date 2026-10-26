# Riverbend Command — Codex project instructions

## Mandatory orientation (before touching application code)
Read `EOP.md`, `CONTEXT_HANDOFF.md`, `DECISIONS.md`, `docs/requirements.md`, `docs/design.md`, and `AI-USAGE.md` in full. Treat those as the candidate-approved project baseline. The original hiring exercise is confidential; do not add it to the repository, include real business data, or copy confidential employer code.

## Collaboration and authority
- Candidate owns business decisions, architecture choices, review, and final acceptance. AI may write code, tests, scaffolding, and docs, but must be transparent about authorship.
- For consequential *new* decisions or deviations: explain the question, recommend an approach, compare only genuinely defensible alternatives (no straw men), outline effort/risk/reversibility, and **STOP** for candidate selection. Candidate may modify the options.
- For routine implementation details within an approved design, work autonomously; do not ask for approval for filenames, imports, formatting, variable names, or mechanical chores.
- Never treat silence or a generic “continue” as permission to overturn an approved ADR.
- When only one reasonable option exists, say why without manufacturing alternatives.

## Engineering hard rules
- Server enforces authorization; UI controls alone are insufficient. No real auth needed: demo identity is an adapter, not a trusted production credential.
- Store money in integer cents, including precise boundary logic. Restrict invalid/negative amounts.
- Keep business policy in domain/server code, not React.
- Decisions and audit inserts belong in a single DB transaction. Do not expose audit update/delete endpoints.
- Rejection needs a nonblank comment; requesting changes should also require a comment.
- Never allow the requester to approve their own request. Finance viewer cannot approve.
- On resubmission create a fresh version and approval stages, preserving past events/stages; stale stage IDs cannot approve a newer version.
- Use seed data only. No secrets in commits. Avoid unnecessary dependencies and paid services.
- Each vertical slice: implement → test → run → report results. Fix failing tests before declaring complete.

## Process and traceability
- Keep `AI-USAGE.md` updated with actual prompts, significant changes, what AI did vs candidate, missteps, corrective prompts, time savings/costs, and genuine omissions. Do not invent failed prompts or claim tests ran if they did not.
- Update `DECISIONS.md` after candidate makes a substantive new decision.
- No autonomous feature expansion or dramatic UI redesign beyond accepted MVP.
- Keep documentation concise and commands reproducible.
- Expect potential live interview change: design small comprehensible modules and explainable tests.

## First action
Inspect the repo and present a concise implementation sequence that follows the approved baseline. Call out any genuine blocker or materially consequential deviation. Then implement the first vertical slice (DB schema + seed + submission + routing + audit + tests), unless the candidate requests a different slice.
