# Milestone 3 — guided manual user acceptance test

Status: **Candidate completed primary-workflow manual UAT and reported that observed functionality met expectations.** Candidate authorized the Milestone 3 commit after the minor label correction and successful validation. No Milestone 4 work or production-readiness claim is implied.

## Candidate-reported manual results

Reported by the candidate on 2026-10-26, independently of Codex's earlier browser checks and automated tests:

| Workflow personally tested | Observed outcome reported by candidate |
|---|---|
| Request submission | Met expectations |
| Approval routing | Met expectations |
| Requests for changes | Met expectations |
| Resubmission | Met expectations |
| Role switching | Met expectations |
| Finance visibility | Met expectations |
| Audit history | Met expectations |

The candidate did not report exact amounts, request IDs, browser/version, individual negative cases, refresh checks or responsive/keyboard coverage. The detailed worksheet below remains a reproducible guide; blank individual results are **not independently reported**, rather than evidence that all steps passed. Deferred automated integration/concurrency coverage remains pending.

Minor finding: candidate reported verbose “Active demo user” text and an overlapping outlined floating label. Codex changed it to “Active user” and aligned label typography with the outlined input/notch typography, including the same mismatch in other outlined form labels. No business terminology or backend logic changed. Post-correction verification is recorded in the engineering review and AI-USAGE; candidate re-verification of the correction is not claimed.

Tester: __________  Date: __________  Browser/version: __________  Viewport: __________

Result convention: Pass / Fail / Not run. Record observations and any console errors. Use only synthetic data. Keep existing requests; do not reset/delete the database or clear history.

## Local environment

Open **http://127.0.0.1:5173/**. API liveness: http://127.0.0.1:3001/api/health.

Both services were reachable during engineering preparation. Existing local database: `prisma/dev.db`; both checked-in migrations are applied. **For the current workspace, skip install/migration/seed steps and start testing.** If either service already occupies its port, use the running service; do not start a duplicate or kill an unrelated process.

To start stopped services, run from repository root in separate terminals:

```sh
# Terminal 1: API, using the existing local synthetic database
DATABASE_URL=file:./dev.db PORT=3001 npm run start:server
```

```sh
# Terminal 2: frontend, with /api proxied to port 3001
npm run dev:client
```

For a fresh checkout or genuinely missing setup only (Node 22.23.4/npm 10.9.9 were used):

```sh
npm ci
# Create .env only when absent; never overwrite an existing configuration.
test -f .env || cp .env.example .env
npm run db:generate
# Only if the database file does not yet exist:
test -f prisma/dev.db || touch prisma/dev.db
DATABASE_URL=file:./dev.db npm run db:migrate
# Only if the demo personas are missing or you intend to restore their configuration:
DATABASE_URL=file:./dev.db npm run db:seed
```

`.env.example` contains only `DATABASE_URL="file:./dev.db"` and `PORT=3001`. No credentials/sign-in are needed. The explicit shell settings above select the existing demo DB and port; keep API port 3001 unless the Vite proxy is also updated. The seed upserts five demo users/reporting relationships; it does not delete purchases, but can overwrite modified demo-user configuration. Do not run it unnecessarily. No reset command is part of this walkthrough.

## Demo identities

| User ID | Display name | Role | Intended experience |
|---|---|---|---|
| `employee` | Alex Chen | Employee | Create, track, edit/resubmit own eligible requests |
| `manager` | Sam Rivera | Manager | Assigned first-stage approvals |
| `director` | Morgan Reed | Director | Assigned second-stage approvals |
| `vp` | Jordan Ellis | VP Finance | Assigned final stage for high-value requests |
| `finance` | Taylor Brooks | Finance viewer | Company-wide read-only view |

Choose personas with **Active user**. This is caller-controlled demo identity, not production authentication. Close the request drawer before changing personas; the selector is intentionally disabled while a form/action is active. Use Alex for submission: the seeded reporting chain supplies manager → director → VP. Approval-role personas do not have an alternative manager-stage reporting chain configured for their own purchases; a routing-configuration error is not silently rerouted.

## Test record

Vendor: `UAT Emergency Repair — <unique suffix>` (choose a fresh suffix so existing data is distinguishable).

Reason: `Synthetic emergency repair for manual UI acceptance.`

Initial amount: **14000.00 USD**. Revised amount: **800.00 USD**.

Abbreviated request reference: __________  Full request ID: __________

Use the same request throughout. Creation submits directly; there is no separate draft-save/create endpoint. Scroll the panel if actions are below the fold. Wait for saving/loading to finish; do not double-click decisions or blindly retry an uncertain submission.

## Requester — Alex Chen

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| R1 | Select Alex; choose **New request**. Enter the test vendor, 14000.00 and synthetic reason. | Labeled form opens; keyboard focus enters it; demo persona remains clear. | __________ |
| R2 | Choose **Submit request**. Record its ID. | Success feedback and detail drawer. Version 1, $14,000.00, Pending approval. Manager Sam pending; director Morgan and VP Jordan waiting. Submitted audit identifies Alex. | __________ |
| R3 | Read the current owner and compact timeline. | Sam is clearly responsible now; later stages are waiting, not completed. Alex has no approval controls and cannot edit while pending. | __________ |
| R4 | Refresh the browser with the detail URL open. | Same request, version, amount and persisted history reload; demo selection is retained. No duplicate request created by refresh. | __________ |

## Manager — Sam Rivera

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| M1 | Close drawer; select Sam; open **Assigned approvals** and find the test vendor/ID. | The pending request appears with Sam as current owner. | __________ |
| M2 | Open it; choose **Approve**, then confirm **Approve request**. An approval comment is optional. | Decision saved once; request leaves Sam's assigned queue. This is expected: former assignees have no extra detail access. | __________ |
| M3 | Switch to Alex's request detail or directly to Morgan's assigned queue. | Manager is completed/approved, director Morgan is pending, VP is waiting. Request remains Pending approval. Audit includes Sam's approval. | __________ |

## Director — Morgan Reed

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| D1 | Select Morgan; find/open the same request in Assigned approvals. | Morgan is now the current approver, with decision controls. Prior manager approval is visible. | __________ |
| D2 | Choose **Request changes**. Try blank and whitespace-only explanations without submitting a valid decision. | Confirmation remains disabled; a meaningful explanation is required. | __________ |
| D3 | Enter `Please revise the synthetic purchase scope and amount.` Confirm. | Request returns to requester and leaves Morgan's active queue. No later VP approval activates. | __________ |
| D4 | Switch to Alex; open the same request. | Changes requested status, director explanation and edit/resubmit controls. No active approver; prior manager approval remains in history. | __________ |

## Requester resubmission — Alex Chen

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| V1 | Choose **Edit request**, change amount to **800.00**, optionally clarify reason, then **Save changes**. | Current fields show $800.00. Request remains returned/version 1 until resubmitted; latest submitted snapshot still shows original $14,000.00. No submitted snapshot is silently overwritten. | __________ |
| V2 | Choose **Resubmit for approval**. | Version 2, $800.00, Pending approval. Fresh manager-only stage pending. No new director/VP stages for version 2. | __________ |
| V3 | Expand historical revision 1; read its stages and audit. | Original $14,000 snapshot, manager approval and director return/comment remain. Old future VP is superseded, not falsely approved. Old approval does not complete the new manager review. | __________ |
| V4 | Refresh again. | Version 2 and new route/history remain persisted. | __________ |
| V5 | Switch to Sam and approve version 2. | Fresh manager approval is required and recorded; final request becomes Approved with no current approver. Verify through Alex or finance after it leaves Sam's queue. | __________ |

## Finance — Taylor Brooks

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| F1 | Select Taylor. | Company requests view includes test request and existing company records. No New request control. | __________ |
| F2 | Search the unique vendor, full ID and displayed abbreviated reference. Clear filters between attempts. | Test request found; searching does not change persisted state. | __________ |
| F3 | Filter status Approved; also try Pending approval and Current approver Sam. | Status/approver filters intersect. Once test request is approved it has no current approver, so Sam filter excludes it. Empty results can be correct. | __________ |
| F4 | Try Aging only; inspect summaries. | Only server-flagged approvals older than 72 elapsed hours appear; zero is valid. Summaries describe current view before filters, not only visible rows. Pending value excludes approved/rejected requests. Do not fabricate aging by modifying DB/timestamps. | __________ |
| F5 | Open test request; inspect current timeline, both revision snapshots and chronological audit. | Version 2 manager approved; version 1's earlier approval/return still readable with names/comments/timestamps. | __________ |
| F6 | Inspect all request action areas. | No approve/reject/request-changes/edit/resubmit controls for finance. Backend remains final authority; this UI check is not proof of production authentication. | __________ |

## General usability and negative cases

Use a new unsubmitted form for validation checks; cancel it rather than creating unnecessary records.

| ID | Action | Expected outcome | Actual result / Pass-Fail / notes |
|---|---|---|---|
| G1 | Inspect at desktop width and a narrow ~376px viewport. Open/close mobile navigation. | Readable cards/labels; navigation usable; wide table scrolls within its container. Detail fits viewport, with usable close/actions. | __________ |
| G2 | Refresh/reload a list and detail; optional temporary browser network throttling. | Loading state shown, followed by real persisted data; no fabricated metrics/rows. Restore normal network settings afterward. | __________ |
| G3 | Open `http://127.0.0.1:5173/?request=does-not-exist` in a separate tab. | Clear not-found/error state, Retry and Close available; no database change. Return to the valid request URL afterward. | __________ |
| G4 | As Alex, enter vendor/reason and an invalid amount such as `1.234`; attempt submit. | Meaningful amount error, entered fields retained, no purchase created. Blank vendor/reason cannot be submitted. | __________ |
| G5 | Open New request with keyboard; use Tab/Shift+Tab, then Escape. Repeat inside edit/decision dialogs when available. | Focus stays in active dialog, Escape/cancel returns to its trigger; closing a nested editor returns to the drawer. No background action receives accidental input. | __________ |
| G6 | Open/close a request drawer using keyboard and Close. | Focus returns to its View trigger; if that request left the queue, focus returns to the workspace. Current approver remains easy to identify. | __________ |
| G7 | Read returned/rejected/completed/waiting and historical stages. | States are distinguished by text as well as color. Revision grouping avoids implying old approvals authorize current changes. | __________ |
| G8 | Check browser console while opening/closing forms/drawers and typing normally. | No repeated React update-depth error or focus warning. Record exact steps/console text if either recurs; root cause of the earlier native-input error is not established. | __________ |

Optional network-failure test: if you started the API in your own terminal, stop only that process with Ctrl+C, refresh the client, verify visible failure/no invented data, restart with the command above, then Retry. Do not terminate unrelated processes, reset data or delete DB files. Otherwise use G3 for a non-destructive error-path check and mark network-down coverage Not run.

## Findings and acceptance

Known build note: nonfatal ~539KB minified / ~164KB gzip JS bundle warning; code splitting deferred for this local prototype. Three Prisma-chain advisories remain accepted only under ADR-012. Demo identity, single-role users, last-write-wins edits, limited concurrency coverage and app-level audit protection remain exercise-only limits under ADR-013.

This worksheet does not close the deferred automated final-integration/concurrency cases. Candidate manual execution of this story should be recorded separately from automated coverage.

| Finding / steps to reproduce | Expected vs actual | Severity | Screenshot/console reference | Follow-up |
|---|---|---|---|---|
| __________ | __________ | __________ | __________ | __________ |
| __________ | __________ | __________ | __________ | __________ |

Candidate decision: Primary workflows accepted; commit authorized conditional on label correction and successful final validation.

Notes: ________________________________________________________________

Candidate explicitly authorized the specified Milestone 3 commit after correction and validation. This does not authorize Milestone 4.
