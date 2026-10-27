# Riverbend Command — Requirements

## Problem and goal
Riverbend's emailed purchase exceptions lack traceable approvals and clear ownership. Build a demo application that shows request state, assigned approver, and permanent action history to requesters, approvers, and finance.

## Source interpretation and authority
The original confidential hiring exercise supplies the business scenario. On Oct 26, candidate asked recruiter about approval thresholds, routing/resubmission, absence/self-approval, and finance scope. Recruiter Jen explicitly delegated choices to candidate. The following are **candidate-approved demo assumptions**, not confirmed business policies.

## Rules and assumptions
- Positive purchase amount expressed in dollars to users, stored as integer cents.
- Amount < $1,000: manager. Amount $1,000–$9,999.99: manager then director. Amount >= $10,000: manager then director then VP Finance. At boundaries, use higher tier.
- Stages happen sequentially; only the active assigned approver may act.
- Requester enters vendor, amount, reason; may edit draft or returned requests, not active/approved/rejected requests.
- Approve advances stage or completes request; reject requires reason and ends workflow; request changes requires comment and returns control to requester.
- Resubmission increments request version, recalculates route, restarts stages, preserves all history.
- Finance-only viewer can search/read all requests and history but never approve or revise.
- Requester cannot approve their own purchase even if assigned a qualifying approval role.
- Approver absence: show pending for >72 elapsed hours, no automatic delegation in MVP. Self-approval conflict: prevent action and flag for manual resolution; seeded happy path avoids conflict.
- Identity via seeded demo role/user switcher; no real authentication. Future Microsoft sign-in should replace the identity adapter without modifying policy.
- No real payment, ERP push, email notification, attachments, or company data.

## User stories and acceptance criteria
**US-01 Submit:** As employee, I submit vendor, positive amount, reason. Valid form creates request, version 1, manager stage active, subsequent stages waiting; audit logs submission.

**US-02 Routing:** As approver, I see exactly my active requests. Amount boundaries are tested for 999.99 / 1,000.00 / 9,999.99 / 10,000.00, with correct ordered stages.

**US-03 Approve:** Assigned active approver approves; stage and next assignee update atomically with audit entry; final stage moves request to APPROVED.

**US-04 Reject:** Active approver rejects with nonblank reason; request moves to REJECTED; reason, actor, and time appear in audit; empty reason yields validation error.

**US-05 Request changes:** Active approver asks for changes with required comment; request becomes CHANGES_REQUESTED, requester sees reason and may edit.

**US-06 Resubmit:** Requester edits returned request and resubmits; creates version 2+, new approval chain, old decisions/events preserved and inactive. Stale stage actions denied.

**US-07 Authorization:** Backend rejects actions by unrelated approvers, finance-only viewer, or request owner. Requesters can only edit their own eligible requests.

**US-08 Visibility:** Requester sees own requests, approver sees active queue, finance viewer sees every request. Detail shows compact stages with current owner and full chronological audit.

**US-09 Search/filter:** List supports free text (at least vendor or request ID) plus status and current approver; results reflect persisted state.

**US-10 Bottleneck:** Pending stage activated over 72 hours ago is flagged as delayed; no automated delegation claimed.

**US-11 Quality:** Automated tests cover amount thresholds, sequential transitions, mandatory comments, permissions/self-approval, and revision audit preservation. README enables reproducible local startup.

## Open questions / future business validation
Confirm true VP threshold and exact $1,000 rule; out-of-office delegation policy and substitute approver hierarchy; whether request changes should invalidate all approvals; whether rejected purchases can be reopened; retention and audit hardening; who administers users and finance roles; business-hours aging rules; real SSO and ERP integration.

## Out of scope (MVP)
Production sign-in/Entra integration, notifications, actual payments, escalation delegation, upload attachments, exports, SLA calendar, production hosting, enterprise tamper-proof audit controls.

## Milestone 1 verification status — 2026-10-26
Submission/version-1 routing and initial audit are implemented and tested, including all four specified dollar boundaries. HTTP payload identity injection is rejected; finance submission is denied. API input is integer cents, bounded to 2,147,483,647 by Prisma Int; dollar presentation awaits the UI. Approval actions, revisions, role-scoped reads/search and aging remain unimplemented. This is not full MVP acceptance. Details: [engineering review](milestone-1-review.md).
