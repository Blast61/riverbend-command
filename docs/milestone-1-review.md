# Milestone 1 engineering review — 2026-10-26

Scope: submission foundation only. No staging, commit, full authorization workflow, or Milestone 2 feature work. Candidate subsequently approved Milestone 1 for commit and accepted the prototype-only residual risk; see ADR-012 in `../DECISIONS.md`.

## Dependencies and exposure

The original four high audit entries represent two underlying advisories plus two inherited entries, not four independent vulnerabilities:

| Package before review | Dependency path | Finding / fix |
|---|---|---|
| `effect@3.18.4` | `prisma@6.19.0 → @prisma/config@6.19.0 → effect` | Context isolation issue; fixed in Effect 3.20.0+. Prisma 6.19.3 pins Effect 3.21.0. |
| `deepmerge-ts@7.1.5` | `prisma@6.19.0 → @prisma/config@6.19.0 → deepmerge-ts` | Recursive-object stack exhaustion; fixed in deepmerge-ts 8+. Latest inspected Prisma 6 patch still pins 7.1.5. |
| `@prisma/config@6.19.0` | `prisma → @prisma/config` | Inherits the above findings. |
| `prisma@6.19.0` | root development dependency; also `@prisma/client → optional peer prisma` | Inherits config findings. |

Evidence: fresh `npm audit --json`, installed manifests/lockfile, `npm ls`, and `npm view prisma@6 version dependencies --json` / `npm view @prisma/config@6.19.3 dependencies --json`.

Applied the non-breaking paired patch to `prisma` and `@prisma/client` 6.19.3, regenerated client, checked types, ran tests and exercised migration/seed tooling. No overrides or forced fixes were used. The original AI implementation's broad “four CLI advisories remain” report missed an available patch; this review corrects it.

After the patch, **three high audit entries remain**: deepmerge-ts and its two parents. No additional moderate/critical findings were reported. npm exits 1 because findings remain. `npm audit --omit=dev --json` also reports these three: the optional CLI peer makes them present in npm's production dependency graph (`devOptional` in the lockfile). Calling them absent from production installs would be inaccurate. They are tooling/configuration dependencies by use, not imports in the Express submission code; `@prisma/client` itself is a runtime dependency.

The [deepmerge maintainer advisory](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) describes cycles in merged JavaScript objects, which plain JSON cannot produce. This application passes validated scalar fields to Prisma Client, has no user-supplied Prisma config, and does not merge request bodies with that library. Inference from code and advisory: low relevance to the current loopback-only synthetic prototype; no demonstrated remote exploit path. This is a reachability review, not an exploit reproduction or proof of universal safety.

The [Effect maintainer advisory](https://github.com/Effect-TS/effect/security/advisories/GHSA-38f7-945m-qr2g) concerns concurrent fiber scheduling and request context. The app does not use Effect RPC or Effect-backed identity context; nevertheless the available non-breaking patch was applied.

No supported non-breaking complete remediation was found in inspected Prisma 6 releases. npm recommends Prisma 7.10.1; deepmerge 8 overrides cross its pinned major range. Neither was applied. A major Prisma migration would require separate review and validation. Recommendation: retain the documented residual risk for the existing local synthetic scope and revisit before deployment or accepting untrusted configuration. Subsequent candidate decision: explicitly accepted these three audit entries for the local, time-boxed prototype only, based on this analysis and the absence of an identified submission API path. Production deployment is excluded. See ADR-012 in `../DECISIONS.md`; the dependencies remain affected.

## Identity and authorization foundation

`server/src/identity.ts` alone interprets `X-Demo-User-Id`, rejects missing/unknown users, and returns a database-backed actor. The submission route resolves that actor before calling the domain service. Strict Zod validation rejects payload `requesterId`; the service assigns requester and audit actor from the resolved actor. Tests assert those persisted IDs and reject injection.

Future authorization checks can use the explicit actor parameter without restructuring routing or persistence. For Entra ID, replace the adapter with validated-token identity resolution and a tenant/object-ID-to-local-user mapping; do not accept a caller header as production identity. Token validation and external identity mapping are not implemented. The current single-role field supports the seeded personas; independent multi-role/finance grants would require an explicit model extension later, not a claim of existing functionality.

Anyone who can reach this demo API can select any seeded user by header. It is not authentication. Finance write denial is implemented. Self-approval, assigned-stage checks and read visibility remain later workflow work; no approval endpoints currently exist.

## Transactional integrity

`submit` computes the pure threshold policy before writing; all reporting-chain reads, request insertion, ordered stage inserts, active-stage assignment and initial audit insertion use one Prisma interactive transaction and its transaction client. Exceptions propagate and roll back the whole write set.

Two failure-injection tests prove rollback: fail the second stage insert after the first stage/request exist; fail the audit insert after all stages exist. Both assert zero surviving requests, stages and events. Separate tests reject missing reporting configuration and database-level zero amounts. These tests do not simulate power loss or concurrent approval actions; those are not claimed.

## Validation and coverage

Executed during review:

```sh
npm audit --json
npm audit --omit=dev --json
npm ls prisma @prisma/client @prisma/config effect deepmerge-ts
npm view prisma@6 version dependencies --json
npm view @prisma/config@6.19.3 dependencies --json
npm install --save-exact @prisma/client@6.19.3
npm install --save-dev --save-exact prisma@6.19.3
npm run db:generate
npm run typecheck
npm test
DATABASE_URL=file:./dev.db npm run db:migrate
DATABASE_URL=file:./dev.db npm run db:seed
```

Migration verification: one migration found, no pending migrations; seed rerun succeeded with five synthetic users. Prisma also displayed a major/RC update notice; no such upgrade was applied.

Latest suite: **19 passing, 0 failing, one test file**. TypeScript: exit 0, no diagnostics. Exact HTTP boundary cases: 99,999 / 100,000 / 999,999 / 1,000,000 cents, corresponding to $999.99 / $1,000.00 / $9,999.99 / $10,000.00. Tests assert roles, assignees, active/waiting statuses, version, requester, and audit. Validation also covers invalid amounts, blank inputs, payload identity injection, missing/unknown identity, finance denial, missing hierarchy, domain amount guards and database amount enforcement.

Warning: Prisma's package.json seed configuration is deprecated for Prisma 7. Initial patched client generation was denied access to the engine cache by the sandbox; rerun with permission succeeded. Tests required localhost permission. No remaining test failure is concealed. This review did not repeat the earlier live API smoke test; current HTTP tests exercise the patched API against isolated SQLite.

Relevant untested edges: very long fields and body-size errors, seed-chain misconfiguration variants, and multi-role identities. Full approval/self-approval/revision/concurrency rules belong to later slices and are unimplemented. The database does not enforce all state/active-stage invariants against arbitrary direct SQL; submission service establishes them. Audit is append-only through the existing API, not protected against database administrators.

## Git hygiene and proposed contents

Inspected status, tracked/untracked inventory, full application/config/migration/test files, documentation diffs and lockfile metadata. Credential-pattern scan found no matches; lockfile URLs contain no credentials and use the public npm registry. This is a bounded review, not a guarantee of comprehensive secret detection. `.env.example` contains only local database URL and port, with no secrets.

Expanded `.gitignore` to cover SQLite `.sqlite` WAL/SHM and `.sqlite3` files/sidecars, logs, TypeScript build metadata, Vite cache and explicitly named local temporary directories. Existing rules exclude `.env`/`.env.*` (except `.env.example`), node_modules, `.db` files/sidecars, dist, coverage and .DS_Store. Probed exclusions with `git check-ignore -v`; inspected tracked paths for sensitive/build artifacts. No such files are tracked. Actual local ignored files include node_modules, prisma/dev.db and .DS_Store.

Intended new files: package manifest/lockfile, TypeScript/Vitest config, `.env.example`, server source/tests, Prisma schema/migration/lock/seed. Intended modified files: ignore rules, README, design/requirements, decisions, AI usage and this review. AGENTS.md, EOP.md, handoff and original project prompt are already tracked and remain included in the repository. No frontend implementation or confidential source brief is included. No temporary debug script/log is proposed. No staging or commit was performed.
