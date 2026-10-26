# Riverbend Command — Context Handoff (Approved Planning Baseline)

This is a curated conversation-to-repository handoff, not a complete transcript. Future agents MUST read this together with DECISIONS.md, requirements, design, and the exercise-specific EOP. Unresolved decisions may not be silently assumed to be approved.

## Purpose
Build a fictional purchase-exception approval system for Riverbend Supply Co. that eliminates inbox-based approvals and shows the requester, approvers, and finance who is responsible, which stages have been completed, and who approved what when.

## Required functions
- Employee submission: vendor, amount, reason; routing by amount.
- Approve, reject with mandatory reason, request changes; resume correctly after edits.
- Complete action history; role-specific requester / approver / finance views.
- Search/filter list showing request status and current approver.
- Automated tests of core business rules.
- Full stack: UI, API/server, database; seeded demo users acceptable; eventual Microsoft sign-in should be feasible.
- Sensitive constraints: no actual employer confidential data; no real purchases.

## Confirmed stakeholder response
Candidate asked recruiter about exact thresholds, sequencing/resubmission, vacation/self-approval, and finance read-only permissions. Jen responded that the candidate is empowered to decide, be creative, and document choices. No precise business-rule answer was provided.

## Chosen product
Riverbend Command hybrid: compact operations dashboard + compact approval timeline + append-only audit history. Prioritize business value and reliability over animation or scope expansion.

## Candidate AI process and motivation
Candidate previously used Codex to build a ShiftFlow scheduling/time-off application, then personally tested, inspected, and iteratively directed changes, including calendar-style visualizations of overlapping time off. Candidate also authored an Engineering Operating Procedure (EOP) for a refactoring assessment to force explicit review before changes. For this exercise candidate wants meaningful collaboration—real alternatives where warranted, no contrived bad options, no reflexive approval of a single AI-chosen architecture, and clear evidence of candidate judgment. Codex can generate much of implementation, but human retains business decisions, design approval, verification, and accountability. Document actual events and time honestly in AI-USAGE.md.

## Project artifacts expected
README.md; docs/requirements.md; docs/design.md; working UI/API/DB/tests; AI-USAGE.md; AGENTS.md or tool-appropriate guidance. Optional short recording. Around four focused hours per assignment. A later walkthrough may include a small change with AI.

## Implementation handoff
The candidate reviewed and approved the planning documents, then authorized starting implementation on 2026-10-26. Read AGENTS.md, EOP.md, DECISIONS.md, docs/requirements.md, docs/design.md, and AI-USAGE.md in that order. Approved baseline decisions are captured in DECISIONS.md, including a draft stack; do not restart product ideation. Implement vertically; pause for material deviations and offer real alternatives. The source brief is confidential and MUST NOT be added to a public repository.
