# Milestone 4 — engineering verification and submission readiness

Date: 2026-10-26. Baseline: `796c4c49347252e4a5c6b1936e69e1c8647eb12f` (Milestone 3).

**Assessment: ready for candidate final review and the local-prototype submission, subject to final commit approval. No technical blocker identified.** No commit, push, deployment or feature expansion performed. This report does not establish production readiness.

## Requirements traceability

PASS means supporting implementation and executed evidence exist for the stated MVP scope. Historical browser observations and candidate reports are labeled separately from this milestone's executed automated checks. PASS is not exhaustive verification of every possible execution or future business policy.

| Requirement | Implementation location / function | Verification evidence | Status |
|---|---|---|---|
| US-01: vendor, positive amount and reason; persisted initial submission/route/audit | `server/src/app.ts` POST handler, `validation.ts:purchaseFields`, `submission.ts:submit`, `workflow-store.ts:installRoute`; `client/src/components/PurchaseForm.tsx` | `submission.test.ts`: valid submission, invalid amounts/blank fields, identity injection, SQL constraint and rollback tests. M4 fresh-copy real HTTP submission and restart persistence. Candidate reported submission met expectations. | PASS |
| US-02: sequential amount routing; exact $999.99/$1,000/$9,999.99/$10,000 boundaries | `server/src/policy.ts:route`, `workflow-store.ts:installRoute` | `submission.test.ts` four cent-boundary cases assert role order, assignees, exactly one pending stage and later waiting stages. `client/src/tests/forms.test.tsx` checks exact dollar conversion. | PASS |
| US-03: assigned approvals advance stages, final approval completes; state/audit atomic | `workflow.ts:decide`, `authorization.ts:assertApprover`, `workflow-store.ts:transaction` | `workflow.test.ts`: manager→director→VP, manager-only completion, next-stage activation failure and all decision audit failure rollbacks; M4 exact lifecycle/conflicting decision tests. Candidate reported routing met expectations. | PASS |
| US-04: nonblank rejection reason; terminal rejection | `validation.ts:approvalInput`, `workflow.ts:decide`, `DecisionForm.tsx` | Server undefined/empty/whitespace rejection tests, terminal state/edit denial and audit assertions; frontend required explanation test. Prior Codex real-browser rejection, not newly repeated in M4. | PASS |
| US-05: nonblank change-request comment; return editing control | Same validation/decision functions; `RequestPanel.tsx`, `DecisionForm.tsx` | Server mandatory-comment/return-state tests; M4 exact director-return case; frontend meaningful explanation test. Candidate reported changes workflow met expectations. | PASS |
| US-06: eligible owner edit/resubmit, fresh version/route, preserve old snapshots/decisions/events | `workflow.ts:edit/resubmit`, `workflow-store.ts:installRoute`, Prisma `PurchaseRevision`/`ApprovalStage`; `RequestPanel.tsx` | M4 exact $14,000→$800 scenario verifies two snapshots, old stages, manager-only new route, fresh approval, all six audit events via owner/finance GETs and stale-stage rejection. Existing upward/downward/repeated-return and rollback tests retained; frontend edit/resubmit test. Candidate reported resubmission met expectations without exact amounts specified. | PASS |
| US-07: backend permissions, no self-approval, finance read-only, owner-only edits | `authorization.ts:assertWritable/assertOwner/assertApprover`, `identity.ts:demoIdentity`; mutation services | `workflow.test.ts`: unrelated/wrong-role/out-of-order/finance/owner denials, assigned qualified self-approval, owner-only edits, injectable identity and payload override rejection. UI tests verify capability-driven controls. Production identity is separately deferred below. | PASS |
| US-08: role-specific records/current owner/history | `authorization.ts:readScope`, `requests.ts:listRequests/getRequest`, `workflow-store.ts:detailInclude`; `App.tsx`, `RequestQueue.tsx`, `RequestPanel.tsx`, `Timeline.tsx` | Server own/assigned/finance scopes, former/future/unrelated detail 404; immutable history tests; client role switch, timeline and finance-controls tests. Candidate reported role switching, finance visibility and audit history met expectations. Prior Codex browser/API connectivity checks documented in M3 review. | PASS |
| US-09: vendor/ID search and status/current-approver filters | `requests.ts:listRequests`, `validation.ts:requestQuery`; `App.tsx` local filters over server-scoped records | Server intersection/malformed query tests; workspace search/display-ID/status/aging filtering test. Current owner comes from persisted active stage. Prior Codex native finance search; no claim candidate tested every filter. | PASS |
| US-10: >72 elapsed-hour delayed indicator; no automatic reassignment | `requests.ts:presentRequest`, `App.tsx`, `RequestQueue.tsx` | Server test sets a 73-hour activation and verifies delayed flag; client aging filter test. Source review confirms strict >72h predicate. Exact 72h clock boundary not independently tested. | PASS |
| US-11: critical automated rules and reproducible README | `server/tests/`, `client/src/tests/`, root scripts; README | M4 root and fresh-copy suites each 93/93; both typecheck/build pass; real migration deployment/upgrade/seed test plus isolated documented setup verified below. | PASS |
| Production Entra ID authentication, multi-role grants, delegation, ERP/payments, notifications, hosting, pagination | Explicit out-of-scope/future items in requirements and ADRs | Not implemented/tested; not needed for local exercise. Demo adapter remains caller-controlled. | DEFERRED |
| Broad concurrency/load/crash recovery, edit/resubmission interaction, formal accessibility certification | ADR-013 and M3 follow-up limitations | Bounded tests/browser checks exist; these broader guarantees are not established. | DEFERRED |

All six requested business requirement categories have supporting MVP evidence. No core requirement marked FAIL. Accepted limitations below qualify the local exercise; they must accompany submission.

## Executed automated validation

| Command / context | Actual result |
|---|---|
| `node --version`; `npm --version` | v22.23.4; 10.9.9 |
| `npm test` — root, first sandbox attempt | 31 passed /62 failed; API listeners denied with `listen EPERM 127.0.0.1`. Not counted as a passing run. |
| `npm test` — identical root retry with listener permission | **93 passed /0 failed, 7 files**: 19 submission +45 workflow +1 migration =65 backend; 28 frontend. |
| `npm run typecheck` — root | Passed, backend and client, no diagnostics. |
| `npm run build` — root | Passed, 913 modules; JS 538.83KB minified /164.47KB gzip; CSS 9.95KB /3.07KB gzip. Nonfatal >500KB JS warning retained. |
| `npm test` — freshly installed temporary copy | **93 passed /0 failed, 7 files**, with local listener permission. |
| `npm run typecheck`; `npm run build` — temporary copy | Both passed; same bundle sizes/warning. |
| `npm audit --json` — registry access retry | Exit 1 for **3 high, 0 critical/moderate/low** entries, unchanged; see security section. Initial sandbox attempt could not resolve registry. |
| `git diff --check` and new-file whitespace inspection | Passed during final review; no staged files. |

Full suites include appropriate real HTTP/Supertest + SQLite integration tests, all existing M1–M3 tests and migration tests. Frontend tests use jsdom and mocked API responses; they are not full browser end-to-end tests. No new native browser UAT was performed in M4. Candidate M3 UAT and prior Codex browser checks retain their separately reported scope in `milestone-3-uat.md` and `milestone-3-review.md`.

### Newly closed high-value test gaps

Four tests under `Milestone 4 integration regressions` in `server/tests/workflow.test.ts`:

1. **Exact complete lifecycle:** employee submits 1,400,000 cents; manager approves; director requests changes with comment; owner patches to 80,000 cents and resubmits. Version 2 has one fresh manager stage, old snapshots/decisions/stages remain unchanged; old stage rejected; manager approves new stage. Owner and finance details expose both snapshots, prior stages and all six ordered audit actions/actors/versions, with director comment intact. Database contains exactly six events.
2. **Conflicting approval/rejection:** two simultaneous HTTP attempts against a manager-only stage yield one 201 and one 409. Stored request state, single stage decision/status and sole decision audit agree with the successful response; stale retry cannot append an event. Either winner is allowed; no assertion about scheduling preference.
3. **Stale same-version forms:** two forms read version 1; one saves, then the older form saves the same field. Both succeed; latter value wins, submitted snapshot stays unchanged, two edit audits record the overwrite. This demonstrates the accepted limitation rather than stale-form protection.
4. **Overlapping edits:** two simultaneous HTTP patches change the same field at version 1. In the tested single-client execution both return 200; their two audit deltas form the serialized chain, final field equals the last edit, and submitted snapshot remains unchanged.

Concurrency scope: a single app and Prisma client with an isolated SQLite file, concurrent Supertest requests. These runs do not prove multi-process scheduling, fairness, every possible lock error, or success under arbitrary load. SQLite transactions and conditional status/version/stage claims remain unchanged. Selected Prisma contention codes map to 409; unexpected errors can return 500. Simultaneous edit/resubmission and crash-recovery tests remain deferred. No optimistic edit locking was introduced.

## Reproducibility verification

Performed using a temporary clean file copy of tracked working files, including the four new tests, without local `.env`, database, node_modules or generated output. This is not a remote Git clone or cross-platform CI run. Node/npm versions above were used.

Executed from that isolated copy:

```sh
npm ci
cp .env.example .env
npm run db:generate
touch prisma/dev.db
npm run db:migrate
npm run db:seed
npm run db:seed
npx prisma migrate status
npm test
npm run typecheck
npm run build
```

`npm ci` installed 310 packages successfully. Both checked-in migrations applied to the new empty SQLite file; seed twice succeeded, and status reported schema up-to-date. First seed was blocked by sandbox tsx IPC permission, then the same command succeeded with permission. No migration/seed/reset was run against the development database. The existing migration test additionally verifies M1 data upgrade/backfill, unchanged stages/audit, repeat deploy and fresh seed idempotence.

Started the temporary copy using `PORT=3311 npm run start:server` and `npm run dev:client -- --port 5174`, with its Vite proxy temporarily pointed at 3311. These temporary-only port changes avoided the existing 3001/5173 services and are not proposed repository changes. Removed inherited DATABASE_URL from the subprocess environment to verify `.env.example` alone resolves the new database.

Read/write HTTP assertions verified frontend root 200, API health 200, proxied five demo users, empty initial finance queue, synthetic request submission 201 and manager approval 201. Stopped/restarted only that API process, then finance detail still showed APPROVED and both audit events. Temporary API/frontend process groups were stopped afterward. Existing development services and data were preserved. Diagnostic scripts/logs remain outside the repository; no new tooling dependency introduced.

README's normal setup uses 3001/5173, guarded `.env` creation and guarded empty-file creation. The fresh seed intentionally supplies users only; reviewers create purchases as Alex. Seed upserts can restore persona configuration, so avoid unnecessary seeding on a populated workspace. API defaults to loopback 3001; PORT override must also update the Vite proxy. No credentials or undocumented local configuration required.

## Documentation completeness

| Artifact | Review / correction |
|---|---|
| README | Product/features/stack, Node 22/npm 10 tested versions, exact setup/scripts/ports, five personas, API examples, known limitations. Corrected stale pending-M3 status and 89-test total to final verification/93; linked this report. |
| Requirements | Stakeholder ambiguity, candidate-owned assumptions, US-01–US-11, scope cuts and acceptance rules present. Added final traceability reference without changing thresholds/policy. |
| Design | Models/states/transitions/endpoints, centralized identity/auth, transaction/audit and revision boundaries present. Updated deferred-test status and bounded concurrency evidence. |
| DECISIONS | Accepted ADRs preserved; M4 verification trace adds no new architecture choice or risk acceptance. |
| AI-USAGE | Existing pre-implementation ChatGPT planning, candidate decisions, representative prompts and Codex implementation logs retained. Consolidated actual authorship, real corrections, tool rationale and qualitative efficiency/overhead. Added current validation, setup, security and limitations. |
| AGENTS / EOP | Match candidate-directed decisions, implement/test/run/report, authority boundaries and commit gates used. AGENTS unchanged; EOP clarifies approximately four hours was planning scope, not a measured total. |
| Prior reviews / UAT | Preserve historical results; M2 follow-up now links closure of selected gaps. Candidate-reported primary workflow UAT is separate from Codex/native/component evidence; blank individual UAT rows are not silently passed. |
| Migration documentation | Existing fresh/upgrade/seed instructions and custom money CHECK preservation remain accurate; no new migration needed. |

AI record qualifications: ChatGPT selected for planning/tradeoffs and Codex for repository implementation/verification based on prior candidate workflow. AI substantially generated code/tests/configuration/docs; candidate directed product/policy/architecture, engineering corrections, risk acceptance and manual UAT. No specific candidate hand-written source contribution is established. Real corrections include MUI type adaptation, dependency security patch, focus restoration and the candidate-reported label mismatch. No exact active-development duration, quantitative savings/cost or complete model-version history was recorded. Work spans multiple focused sessions; timestamps are not active-time evidence. Candidate may supply additional personal contribution/tool-version/time information if desired; it has not been fabricated and is not needed for software setup.

## Security and Git hygiene

Fresh full npm audit reports the same three high entries: `prisma@6.19.3 → @prisma/config@6.19.3 → deepmerge-ts@7.1.5`. `@prisma/client@6.19.3` also resolves the CLI optional peer; do not label the entire chain absent from production installs. No new frontend finding or dependency change in M4. The [upstream advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) concerns recursive object graphs passed into affected merge functions; plain JSON alone does not create that condition. Source review found no affected merge call or user-controlled configuration path in the application endpoints. This is a reachability assessment, not a general safety guarantee.

Audit suggests Prisma 7.10.1 as a major fix; deepmerge-ts is patched in 8.0.0. No major upgrade, override or `npm audit fix --force` executed. ADR-012 retains candidate's local, time-boxed acceptance only; reassess before production or affected configuration changes. Earlier Effect fix remains in Prisma/Client 6.19.3.

Inspected all 63 tracked paths and current content: no tracked secret env, SQLite data, dependency directory, build output, debugging log or machine-specific artifact found. Credential-pattern inspection found no private keys/tokens/credential assignments. Scanned 93 reachable Git-history blobs for private-key/token patterns and SQLite signatures: no matches. These bounded scans are not a guarantee of detecting every possible secret encoding. `.env.example` contains only the local SQLite URL and port; `.gitignore` probes exclude envs, DB/sidecars, node_modules, dist, coverage and logs.

Repository source/seed/test inventory uses synthetic examples. Reviewed `FIRST_CODEX_PROMPT.md`: project-specific candidate implementation instructions, not the confidential original hiring brief. No original brief/document attachment or real business dataset found in tracked inventory. References to the exercise and curated planning context are present intentionally; they are not a copied brief. Candidate retains final responsibility for any submission destination's confidentiality rules. No new confidential attachment was copied into the repo.

Proposed changes are tests and documentation only; no changes to `server/src/`, `client/`, Prisma schema/migrations/seeds, package manifests/lockfile or configuration. State transitions, read scope, routing, revision writes, audit persistence and transaction boundaries are unchanged from M3. No consequential backend behavior change or ADR deviation identified. Nothing staged; no commit/push/deploy performed.

## Remaining limitations and recommendations

- ADR-012: three high Prisma-chain entries accepted only for this prototype. Not production clearance.
- ADR-013: demo identity, single-role personas, last-write-wins edits, bounded concurrency evidence and application-level audit/snapshot protection. Database administrators can alter stored history.
- Broader multi-process/load/lock-error behavior, simultaneous edit/resubmit, crash recovery and full browser automation remain unverified. Newly added regression evidence does not close these items.
- Earlier direct native-input React update-depth error remains unreproduced with unknown cause. Normal prior browser flows and component tests passed; do not claim conclusively fixed. Focus/label corrections have bounded tests/browser evidence; no formal screen-reader/WCAG/contrast certification.
- Nonfatal ~539KB bundle warning and Prisma package.json seed deprecation remain. Neither blocks local exercise; optimize/migrate only with relevant scope and validation.
- Lists are unpaginated; no push updates, draft-creation endpoint, delegation, notifications, production SSO/hosting/payments or multi-role admin UI. These are documented scope cuts.
- True organizational thresholds, approval invalidation/absence policy and audit retention require future stakeholder validation; current choices remain candidate-approved demo assumptions.

## Final submission checklist

- [x] Core requirement implementation and supporting evidence mapped.
- [x] All 93 tests pass; existing M1–M3 cases retained.
- [x] Backend/client TypeScript and production build pass.
- [x] Fresh install, migrations, repeat seed and real frontend/API integration verified in isolation.
- [x] Candidate primary-workflow M3 UAT report preserved with accurate scope.
- [x] Required documentation and AI authorship/corrections reviewed.
- [x] Dependency findings, synthetic data and Git hygiene reviewed; whitespace check passed.
- [x] Runtime code/architecture preserved; no consequential new decision identified.
- [ ] Candidate reviews this report and approves final tests/documentation commit.
- [ ] Create final commit only after explicit approval; verify clean working tree afterward.
- [ ] Candidate chooses/verifies submission destination/access and submits; no remote access or publication verified here.

No software blocker identified for the agreed local prototype. Remaining candidate action is final review/commit approval and eventual submission logistics. No submission/push/deployment is authorized by this report.

Proposed final commit contents: four tests in `server/tests/workflow.test.ts`; this report; README, requirements, design, M2 follow-up, DECISIONS, EOP and AI-USAGE documentation updates. No application code, dependency or database artifact changes.
