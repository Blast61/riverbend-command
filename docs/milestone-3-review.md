# Milestone 3 frontend review — 2026-10-26

Status: implemented, candidate review pending. No staging/commit or Milestone 4 work. This review separates component mocks from real browser/API evidence.

## Implementation

ADR-014 records the candidate's unified React/TypeScript workspace with Material UI. Vite serves the client and proxies `/api` to the existing Express API. No backend workflow or schema/migration change. The only domain-adjacent refactor moves the unchanged editable-state assertion into the shared authorization module so API action flags and mutations use the same check. API responses add user/request `permissions`; existing mutation enforcement remains server-side.

`client/src/api.ts` owns HTTP serialization/errors and demo identity headers. `types.ts` describes the transport contract. `useWorkspace.ts` owns persisted-data loading, cancellation, role selection and contextual request IDs. `App.tsx` composes the shell and user interactions; smaller components render queue, timeline, version/audit detail and forms. No routing threshold or role-based mutation authorization is implemented in React. Mutation controls consume server-provided flags.

Delivered: branding/demo banner; requester/assigned/company views; real-data summary counts and pending value; vendor/full-ID/display-ID search, status/current-approver/aging filters; loading/empty/error/retry/success states; contextual request drawer; current and historical stages/snapshots/audit; create/edit/resubmit and approve/reject/return forms. Finance has no write controls. Dollar strings are converted to integer cents without fractional floating-point multiplication; API rules remain authoritative. Draft editing works when the API returns an eligible existing draft; no draft-creation endpoint was added.

Summary scope is the selected view **before filters**, clearly labeled. Filters narrow the already server-scoped dataset locally; they do not authorize access or mutate data. This fits the existing unpaginated synthetic dataset; pagination/large-data aggregation remains out of scope. Local storage remembers only the selected demo user, never request data. Detail IDs are reflected in the URL and fetched again after refresh. Role changes clear prior detail/rows and abort/discard stale reads. Role switching is disabled while forms/mutations are active.

## Executed verification

- `npm run typecheck`: backend and client TypeScript passed.
- `npm run build`: Vite compiled the frontend. Build emits a nonfatal >500KB minified chunk warning (about 538KB JS / 164KB gzip); no production performance benchmark or chunk-limit suppression applied.
- `npm test`: final combined run **86 passed, 0 failed, 7 test files**: 61 backend tests (all 60 pre-existing plus capability-response coverage) and 25 frontend tests.
- `npm run test:client`: focused suite expanded from 20 to 24 to 25 tests as creation, API transport and filtering checks were added; final standalone run before the last search-label refinement passed 25/25. Final full suite includes the refined cases.
- `npm audit --json`: exit 1 with the same three high Prisma/config/deepmerge entries accepted under ADR-012. No new frontend advisory was reported. No forced fixes or breaking Prisma upgrade.
- Existing real migration deployment/seed tests remain in the suite; no new migration is required by this milestone.

Tests use temporary SQLite for backend cases and jsdom with mocked API responses for frontend behavior. Component tests cover meaningful comments, exact dollar conversion, retained form values on API errors, finance action visibility, historical timeline states, role/deep-link reload, late-response cancellation, edit/resubmit transport, creation-to-detail navigation, errors/retry and filter/summary scope. API-client tests verify identity/stage/version serialization and backend errors. Mocks are test-only; running application uses real fetch/API data.

## Real browser/API checks

Started API with `DATABASE_URL=file:./dev.db npm run start:server` and frontend with `npm run dev:client`. No browser connector was available, so native Chrome was controlled through the computer-use tool. Candidate explicitly authorized continuing those checks while Chrome was in use.

Observed through the UI:

- Created synthetic $800 and $50 requests; API-derived counts/value and manager assignments updated.
- Switched employee → manager; assigned queue and available actions changed.
- Both rejection and request-changes buttons were disabled without an explanation; entering a comment enabled submission. Recorded rejection of the $50 request and return of the $800 request.
- Switched to employee, edited the returned amount to $850, saved, then explicitly resubmitted. Revision 2 had a fresh manager stage; revision 1 retained its $800 snapshot/return comment.
- Reloaded Chrome with the request URL; the same selected demo user, revision 2, $850 amount and persisted stage/history appeared.
- Switched to manager and approved the fresh stage. It left the assigned queue. Finance then saw APPROVED, both revisions and audit history, with no edit/resubmit/decision controls.
- Finance vendor search narrowed actual persisted rows while summary scope stayed unchanged.
- Inspected four-column desktop summaries and responsive layout at 376 CSS pixels; mobile navigation opened/closed. The wide queue scrolls horizontally within its container. Labels, table/button names, dialog titles, non-color stage labels, keyboard form traversal and close controls were inspected. Reduced-motion CSS and skip link are included. No formal screen-reader/WCAG/contrast audit claimed.

These are Milestone 3 connectivity/usability checks, not the deferred exact $14,000/director-return/$800 integration case or comprehensive concurrency testing. Those gaps remain preserved in the Milestone 2 review for Milestone 4.

## Corrections and observations

- MUI 9 removed several direct system props; first typecheck caught `fontWeight`, `flexWrap`/`gap` usage. Moved those styles to `sx`; subsequent checks passed.
- First combined test run: 80 passed/1 failed. The failing test tried the role switcher before the drawer's closing transition released the modal; changed it to wait for the accessible control. No production timing workaround was added.
- An update-depth error was logged during direct native accessibility-value setting in the first browser form attempt. A persisted request was created; that test tab was closed. Normal keyboard input, subsequent browser workflows and component creation/edit tests did not reproduce it. Root cause is not established; do not present this as conclusively fixed or blame a library without evidence.
- Chrome showed a modal-opening `aria-hidden`/retained-focus warning. Subsequent accessibility snapshots placed focus in the dialog and exposed its controls, but this remains an accessibility review item. No focus protection was disabled to hide the warning. Other observed `runtime.lastError`/message-channel console errors were Chrome-extension-style messages, not demonstrated API failures.
- Live inspection caught an offscreen button click that did not activate resubmission; after scrolling the drawer, the actual action succeeded and persisted revision 2. Only the verified action is counted.
- Search now includes the displayed abbreviated request reference as well as vendor/full ID, avoiding a mismatch between what users see and can search.

## Remaining limits / review items

Demo identity, single-role users, last-write-wins editable versions, limited concurrency coverage and app-level history protection remain accepted prototype constraints (ADR-013). Earlier three dependency entries remain local-only risks. There is no hosting/production auth, draft creation, polling/live push, pagination or workflow editor. Refresh reloads current server state; editing conflicts use existing API errors without automatic retry. Frontend type contracts are checked at compile time, not by a runtime response validator.

Browser modal-focus warning and the unreproduced native-input error warrant attention during candidate review/final integration testing. This is not a production-ready accessibility or reliability certification. Compiled bundle warning is documented. UI preview is available on localhost while the dev processes run. Git hygiene and final test totals are recorded in AI-USAGE; no commit authorized automatically.

## Final hygiene

Reviewed 36 intended modified/new implementation, test, configuration/lockfile and documentation files. Credential-pattern scan found no matches; no secret env, local SQLite database, temporary file or generated build/dependency artifact in proposed contents. `.env.example` remains placeholders. Existing ignores cover actual `dist/`, `node_modules/`, `prisma/dev.db` and machine .DS_Store. No schema/migration changes. `git diff --check` and whitespace inspection including untracked files passed. Nothing staged or committed. API and Vite dev processes remain running for candidate review; Milestone 4 has not begun.

## Focused backend comparison and UAT preparation — 2026-10-26

Baseline: committed Milestone 2 `55a9ef22d0dba37c27996f687e3a784f73ff3804`. Reviewed actual `git diff 55a9ef2 -- server`, not only test results. No backend implementation changes were made during this focused review.

| Modified backend file | What / why | Classification | ADR alignment and new risk |
|---|---|---|---|
| `server/src/app.ts` | Adds `permissions` to demo users and decorates successful mutation responses with `presentRequest(actor, result)`; frontend needs available actions without copying policy. | API integration adjustment | ADR-004/006/010/014 preserved: actor resolution, validated bodies, endpoints and mutation services unchanged. Additional response fields may affect strict response consumers. Presentation executes after a mutation commits: an unexpected decoration error could return 500 despite a successful mutation. No automatic mutation retry is introduced. |
| `server/src/authorization.ts` | Extracts the exact existing draft/returned + expected-version check as `assertEditable`; adds user/request permission descriptions by calling existing owner/approver checks. | Refactor + API integration adjustment | ADR-003/004/008/010/014 preserved. Existing `assertOwner`, `assertWritable`, `assertApprover` and `readScope` bodies unchanged. Flags can become stale or drift from enforcement as future policy evolves; they are advisory, never credentials. `canCreate` is permission, not assurance that reporting configuration can route every amount/persona. |
| `server/src/requests.ts` | Renames/exports response decorator as `presentRequest`, includes actor-specific flags in list/detail/mutation results. | API integration adjustment + small refactor | Same `where: AND(readScope, filters)`, detail includes, status/search filters and sorting; ADR-004/005/008/014 preserved. Read visibility is not expanded. Additional synchronous computation per row; unpaginated demo size limits performance assurance. |
| `server/src/workflow.ts` | Replaces two calls to private `requireEditable` with imported `assertEditable`; removes identical private function. | Refactor | ADR-003/005/008 preserved: same condition, exception status/message and location after owner check, inside existing transaction. No routing, version increment, stage update, snapshot, audit insert, claim or transaction-body change. Main maintenance risk is future unintended shared-guard changes; existing negative tests still exercise enforcement. |
| `server/tests/workflow.test.ts` | Adds a test for request/user metadata across owner, manager, finance and returned state. | API integration test adjustment | Existing 60 backend cases remain. New coverage is not proof of the entire metadata matrix or production identity security. |

Explicit unchanged-file checks: `server/src/workflow-store.ts`, `policy.ts`, `submission.ts`, `identity.ts`, Prisma schema and migrations have **no diff** from M2. Routing thresholds, route installation, transaction wrapper, history retrieval and initial submission audit are untouched. Revision snapshot/stage/audit mutation statements in `workflow.ts` are unchanged. No audit update/delete endpoint introduced. No consequential backend business behavior modification or ADR deviation identified; no new business decision requested. The UI focus correction below is a separate bug fix.

### UI issue investigation and disposition

| Finding | Root cause / reproducibility | Impact / severity | Action and limits |
|---|---|---|---|
| Modal focus / `aria-hidden` warning | Installed MUI `useModal` hides background siblings separately from `FocusTrap`'s effect-based focus move. Our opening handlers left focus on the background trigger; explicit cancellation also returned native focus to the document. The exact browser/library ordering is an inferred mechanism, supported by source and warning; not a claim of a confirmed vendor defect. | Accessibility correctness concern: hidden-focused trigger/transient screen-reader ambiguity and lost keyboard position. Prioritize over size optimization. | Added `overlayFocus.ts`: capture/blur trigger before opening, restore when dialog unmounts or drawer exits, preserve focus in a remaining parent overlay, and fall back to workspace if trigger is gone. MUI trapping/automatic focus protections remain enabled. StrictMode-safe cleanup added. Three new focused tests cover Escape/trigger return, drawer return and nested editor cancellation. Native Chrome verified Escape returns to New request and drawer close to View. After clearing this tab's diagnostic console, tested new-request and drawer open/close cycles showed **0 console messages**. This is bounded evidence, not a full screen-reader audit or guarantee for every future overlay combination. |
| Earlier React maximum-update-depth error | Original log points to controlled Vendor `onChange` during direct native accessibility-value setting. No state synchronization loop was found in source. Current normal typing and a single direct AX value attempt did not reproduce it. Rapid native action batches also showed delayed focus/text observations; that is insufficient to establish the error's cause. | Potentially high impact if it recurs (input/page could become unusable); current reproducibility unknown. | Do not claim fixed. Keep normal-input/component checks and G8 UAT observation. No speculative state/dependency rewrite. If it recurs, capture exact field sequence, active element, console stack and browser/extension context; isolate before changing React/MUI versions or disabling safeguards. |
| Production bundle warning | Reproduces on build: one eager React/MUI application graph exceeds Vite's 500KB reporting threshold. Latest output **538.78KB minified / 164.46KB gzip JS**. | Low-priority initial-transfer/parse cost for a loopback, time-boxed prototype; build succeeds. Not a measured performance failure or security defect. | Recommend deferring lazy-loading/chunk tuning until after correctness/UAT. No warning suppression, new dependency, blanket refactor or benchmark claim. |

Source references for focus behavior: installed `node_modules/@mui/material/Modal/useModal.mjs` and `Unstable_TrapFocus/FocusTrap.mjs`; [MUI modal API](https://mui.com/material-ui/api/modal/) and [MUI modal accessibility guidance](https://mui.com/material-ui/react-modal/). A [related upstream report](https://github.com/mui/material-ui/issues/46682) documents similar symptoms but does not establish this app's precise root cause.

One TypeScript correction during the fix: MUI's Paper slot type rejects a custom data attribute in an object literal; placed the active-overlay marker on the existing panel body instead. New behavior is frontend focus management only; backend authorization or business workflow did not change.

### Current verification and manual handoff

- `npm test`: **89 passed, 0 failed, 7 files** (61 backend + 28 frontend). Includes all existing backend tests and three new focus tests; Escape test runs under React StrictMode.
- `npm run typecheck`: exit 0, backend/client checked.
- `npm run build`: exit 0; documented size warning remains.
- `DATABASE_URL=file:./dev.db npx prisma migrate status`: two migrations, database up to date. No migrate/reset/seed was required or run against existing local data in this review.
- HTTP checks: API `/api/health` and frontend root both return 200. Existing services reused, not duplicated. Browser diagnostics typed/cancelled unsubmitted forms and performed reads only; no purchase/reset/delete/seed operation performed in this review.
- Candidate checklist created at [milestone-3-uat.md](milestone-3-uat.md), with roles, exact startup/setup conditions, expected outcomes and blank actual-result fields. The candidate's $14,000/director-return/$800 story is **prepared, not executed by the agent** in this review; deferred automated final-integration cases remain pending.

Application is ready for candidate manual UAT, not approved for commit. Remaining issue: original input error lacks a known cause; full accessibility and deferred integration/concurrency testing are incomplete. Earlier prototype/security limitations remain. No consequential backend decision is pending; candidate UI acceptance and any requested refinements are pending. Do not interpret the bundle deferral recommendation as production acceptance.

Final handoff: 38 intended modified/new files, nothing staged; inventory checks found no prohibited artifacts or credential-pattern matches. `git diff --check` passed. API health, frontend and proxied demo users each returned HTTP 200. Existing local data preserved; manual UAT remains pending candidate execution.

## Candidate acceptance and final label correction — 2026-10-26
Candidate reported primary-workflow UAT met expectations (submission, routing, changes requested, resubmission, role switching, finance visibility, audit history); see the UAT record for scope qualifications. Commit authorized after correction/validation. Active user replaces Active demo user. Floating-label font sizes now match outlined-input/notch sizes (12px switcher, 14px other fields); no business terms/layout/backend logic changed. Native Chrome verified corrected focused/resting switcher and finance role switch. Existing automated role-switch test uses the new accessible label.

Final `npm test`: 89 passed, 0 failed (61 backend/28 frontend, 7 files), after retry with loopback permission; initial sandbox run had 58 EPERM failures/31 passes. `npm run typecheck` passed; `npm run build` passed with 538.83KB minified/164.47KB gzip JS and the existing chunk warning. Prisma seed-config deprecation, three accepted advisory entries, unknown earlier input-error root cause and ADR-013/deferred integration limitations remain. No backend business logic changed in this correction. No Milestone 4 work.
