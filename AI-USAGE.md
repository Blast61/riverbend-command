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
| To be filled | | | | |

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
