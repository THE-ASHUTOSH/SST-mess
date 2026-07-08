# SST-Mess — Working Plan

> Living document. Pick up here when resuming in another chat or after a break.
> **Last updated:** 2026-06-13

---

## How to use this file

1. Read **Status snapshot** to see where we are.
2. Each **Open item** has: context → options → recommendation → decisions pending.
3. When you decide something, append it to **Decisions log** at the bottom and strike the question.
4. When an item is done, move it to **Completed** with a one-line "what shipped."

---

## Status snapshot

| # | Item | Status |
|---|------|--------|
| 1 | CI pipeline (lint / typecheck / build on PR) | ✅ Done (2026-06-13) |
| 2 | Bulk vendor-selection upload (perf + reliability) | 🟡 Analysis done, awaiting choice |
| 3 | CLAUDE.md + subagents + skills | 🟡 Scoped, awaiting Q8–Q13 answers |
| 4 | (Future) Repo hygiene checks 5–22 from CI menu | ⏸️ Parked |
| 5 | (Future) Cleanup pre-existing lint warnings in `verifyStudentQR` pages | ⏸️ Parked |

---

## Context primer (for a fresh chat)

**Project:** SST Mess Management — internal tool at Scaler for managing student meal selection and verification.
**Stack:** Next.js 15.5.7 (App Router, Turbopack) · React 19 · Tailwind v4 · Drizzle ORM 0.45 · Neon Postgres · Clerk auth (with `sst.scaler.com` / `scaler.com` domain whitelist) · shadcn/Radix UI · pnpm · Node 20.
**Roles:** `admin`, `student`, `vendor`. Pages grouped under `app/(pages)/(admin|student|vendorUser)/...`. APIs under `app/api/{admin,meal,vendor,user,controls}/...`. Schema in `lib/db/schema.ts`.
**Deploy:** Vercel (assumed). DB: Neon (serverless Postgres).
**Maintainer:** Ashutosh (`ashutosh.kumar@scalerailabs.com`). Solo dev right now.

---

## ✅ Completed

### CI pipeline (2026-06-13)

Files added/changed:

- `.github/workflows/ci.yml` — runs on PR-to-main and push-to-main. Steps: checkout → pnpm 9 → Node 20 (from `.nvmrc`) with pnpm-store cache → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm build` (with CI-stub env vars).
- `.nvmrc` — pins Node `20`.
- `package.json` — added `"typecheck": "tsc --noEmit"`.
- `tsconfig.json` — added `"allowImportingTsExtensions": true` so `scripts/analytics-report.ts:9`'s `import … from '…schema.ts'` typechecks. Safe because `noEmit: true`.
- `eslint.config.mjs` — added ignores for `client/**`, `scripts/**/*.js`, `reports/**` (all untracked local cruft).

All three checks pass locally as of 2026-06-13. Pre-existing warnings (missing useEffect dep + raw `<img>`) in both `verifyStudentQR` pages are not blocking — parked.

CI scope chosen by user: **first 4 only** (install+cache, lint, typecheck, build). The other 18 items from the menu (Prettier, Drizzle drift check, tests, semantic PR title, gitleaks, CodeQL, Dependabot, husky, commitlint, branch protection, PR template, etc.) are parked — see "Parked CI menu" below.

---

## 🟡 Open Item 2 — Bulk vendor-selection upload

### Problem

`app/api/admin/upload-vendor-selection/route.ts` times out on large monthly XLSX uploads.

### Root cause (verified by reading the file)

The handler does **N+1 DB round-trips per row** inside a synchronous loop:

- **Line 76 loop** over every XLSX row.
- Each iteration runs `SELECT users` (line 99) + maybe `UPDATE users` (line 103) or `INSERT users` (line 112), then `INSERT vendorSelections` (line 135). That's **2–3 round-trips × N rows**.
- No batching, no `db.transaction`, no `Promise.all`.
- Vendor lookups are correctly preloaded into a Map (line 57). Users are not.
- `forMonth: new Date(month)` where `month = "2026-06"` is timezone-ambiguous — can break duplicate detection across hosts.
- File parsed in-memory inside the function. Next.js serverless body cap is 4 MB (`next.config.ts:14-18`).
- Vercel function timeout: Hobby 10 s, Pro 60 s default (300 s max with Fluid Compute). 500 rows × ~150 ms Neon round-trip ≈ 75 s → past default ceiling.

### Options analyzed (ranked by effort × payoff)

#### Option A — In-place batch fix ⭐ recommended

- Preload **all relevant users in one query** (`WHERE email IN (…)`) into a Map.
- Diff in memory; perform writes as three bulk DB ops:
  - `db.insert(users).values(newUsers).onConflictDoNothing()` for new students.
  - One chunked `UPDATE` for hostel/batch corrections.
  - `db.insert(vendorSelections).values(allSelections)` chunked at ~500 rows per insert (Postgres parameter ceiling ~65k placeholders).
- Wrap writes in `db.transaction(async tx => …)` for atomicity.
- Add **unique index `(user_id, for_month)` on `vendor_selections`** → duplicate detection in DB via `ON CONFLICT DO NOTHING` instead of app-side `Set`.
- Result: ~1,500 round-trips → ~4. A 500-row file completes in **2–4 s**.
- Effort: half a day, no new deps, no infra.

**This is almost certainly enough for current scale.** Recommended starting point.

#### Option B — Client-side parsing + chunked upload

- Client parses XLSX in the browser (`xlsx` is already a dep).
- POSTs rows in chunks of ~100 as JSON.
- Server endpoint becomes idempotent (`ON CONFLICT DO NOTHING`).
- UI gets real progress + resumability. File-size cap disappears.
- Effort: ~1 day on top of Option A.

#### Option C — Direct-to-storage + queued worker

- Client uploads XLSX to **Vercel Blob** or **S3 pre-signed URL**.
- Insert an `upload_jobs` row with `status: pending` + blob key.
- Background worker (Inngest / Trigger.dev v3 / Upstash QStash / `pg_boss`) processes the file, updates the row to `completed | failed` with a JSON report.
- Frontend polls/subscribes the job row.
- Effort: 2–3 days, adds a vendor dep.
- Right call only when there's a *second* long job in the pipeline (analytics, exports, etc.) — otherwise overkill.

#### Option D — Vercel `after()` / `waitUntil`

- Respond `202 Accepted` immediately; finish in `after()`.
- **Does not extend total runtime** — still bounded by function `maxDuration`. Just hides latency from the client.
- Band-aid. Not a real fix.

#### Option E — Local CLI script

- Generalize `scripts/add-vendor-selection.ts` to ingest the XLSX shape with bulk inserts; run with `pnpm tsx scripts/...`.
- No UI for non-devs. Useful as an emergency unblocker if A/B haven't shipped yet.

### Recommended path

**A now → consider B later if UI progress / large files become a need → reach for C only when a second long job justifies a queue.** Add the DB unique index regardless.

### Concrete change set (for Option A)

Files to touch:

1. **`app/api/admin/upload-vendor-selection/route.ts`** — replace the row-by-row loop with:
   - Validate/normalize all rows in memory first.
   - One `SELECT … FROM users WHERE email = ANY(…)` to load existing.
   - Diff: `newUsers[]`, `usersToUpdate[]`, `selectionsToInsert[]`.
   - `db.transaction(async tx => { … bulk inserts … })`.
   - Use `ON CONFLICT DO NOTHING` on the selections insert keyed on `(user_id, for_month)`.
   - Return same response shape so frontend doesn't change.

2. **New Drizzle migration** — add unique index:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS vendor_selections_user_month_uniq
     ON vendor_selections (user_id, for_month);
   ```
   Generated via `pnpm drizzle-kit generate` after adding `.unique()` on the composite in `lib/db/schema.ts`.

3. **Fix the timezone gotcha** — parse `month` as UTC explicitly: `new Date(\`\${month}-01T00:00:00.000Z\`)`.

4. **(Optional) bump `serverActions.bodySizeLimit`** in `next.config.ts` if 4 MB files are realistic. Or move to Option B.

### Decisions pending

- [ ] **Which option(s)?** Pick from A / A+B / A+C / mix.
- [ ] **DB unique index** — confirm we can add it. Need to verify no existing rows already violate `(user_id, for_month)`. If yes, dedupe first or use a partial index.
- [ ] **Body size limit** — keep 4 MB or raise?

---

## 🟡 Open Item 3 — CLAUDE.md + subagents + skills

### Context

Industry guidance (2026) summarized from research:

- CLAUDE.md: aim for **under ~200 lines**, **under ~15 rules**, mix positive + **negative rules** ("never X"), use `IMPORTANT` / `YOU MUST` sparingly for load-bearing items.
- Subagents: prefer **feature-specific** > generic. Check into repo so they version with the code.
- Skills: small, reusable recipes. Add to repo under `.claude/skills/` or `.agents/skills/`.
- Hooks: deterministic (non-LLM) enforcement. Pair with skills/agents.

### Proposed CLAUDE.md outline (~150 lines target)

- **A.** One-paragraph project overview.
- **B.** Tech stack inventory with versions + Node 20 + pnpm.
- **C.** Common commands (`pnpm dev / build / lint / typecheck / drizzle-kit generate`, running scripts with `tsx`).
- **D.** Architecture map (App Router, role groups, API domains, schema location, auth enforcement).
- **E.** Data model summary (one line per table + key relationships).
- **F.** Conventions (kebab-case routes, PascalCase components, snake_case columns, shadcn primitives, `sonner` toasts, `axiosInstance` for client calls).
- **G.** Rules (≤15, draft list — pick from):
  - NEVER commit `.env*`, Clerk keys, `DATABASE_URL`, JWT secret.
  - NEVER run `scripts/remove-*` / `scripts/revert-*` without explicit approval.
  - ALWAYS enforce role via `requireRole([...])` at the top of admin/vendor handlers.
  - ALWAYS lowercase emails before DB lookup.
  - NEVER do N+1 in route handlers — preload into a Map and bulk-insert.
  - ALWAYS wrap multi-table writes in `db.transaction`.
  - NEVER bypass the domain whitelist in `lib/auth-helper.ts`.
  - PREFER server actions for trivial mutations; route handlers for file uploads / external calls.
  - ALWAYS run `pnpm typecheck && pnpm lint` before declaring a task done.
  - NEVER push directly to `main`.
- **H.** "Don't touch without asking" list — `lib/db/schema.ts`, `middleware.ts`, `lib/auth-helper.ts`.
- **I.** Where to look — `scripts/` (ops tools), `reports/` (analytics dumps), `drizzle/` (migrations), `docs/PLAN.md` (this file).

### Proposed subagents (Claude defines under `.claude/agents/*.md`)

1. **drizzle-migrator** — given a schema change, generate migration, dry-run, report rollback risk.
2. **route-auditor** — scan `app/api/**` for missing `requireRole`, missing validation, N+1 patterns, leaked secrets. Read-only.
3. **vendor-data-validator** — given an XLSX, validate against schema constraints (email regex, vendor name, hostel enum) before any upload. Read-only + Bash.
4. **rls-and-rbac-reviewer** — review PRs touching auth/middleware; verify role checks at every entry.
5. **n-plus-one-finder** — grep for `await db.` inside `for` loops; report. Read-only.
6. **release-notes-writer** — produce CHANGELOG entries from a commit range.
7. **schema-doc-generator** — read `lib/db/schema.ts` → markdown ER summary.
8. **xlsx-fixture-builder** — generate synthetic vendor-selection XLSX files of N rows.

**My picks if no answer:** 2, 3, 5, 7.

### Proposed skills (Claude defines under `.claude/skills/*.md` or `.agents/skills/*.md`)

- **a. bulk-upload-pattern** — canonical "preload → diff → bulk insert in transaction" recipe.
- **b. add-role-protected-route** — checklist for new admin/vendor API.
- **c. add-shadcn-page** — scaffold a new role-grouped page with Card/Skeleton/Toast.
- **d. write-drizzle-query** — when to use `db.query` (joins via `with:`) vs `db.select`.
- **e. safe-db-script** — template for `scripts/*.ts` ops: dry-run flag, confirm prompt, export-before-delete.
- **f. pr-checklist** — pre-merge gates (typecheck, lint, screenshots, migration dry-run).

**My picks if no answer:** a, b, c, e.

### Hooks (optional — deterministic, not LLM)

- **pre-commit**: `pnpm lint-staged` + `pnpm typecheck`.
- **post-tool-use on Edit of `schema.ts`**: auto-run `pnpm drizzle-kit generate` and stage the migration.

### Decisions pending

- [ ] **Q8** — CLAUDE.md sections: all of A–I, or trim?
- [ ] **Q8b** — Rules from G list: keep all 10, or add/remove?
- [ ] **Q9** — Subagents: which from 1–8? (My picks: 2, 3, 5, 7.)
- [ ] **Q10** — Skills: which from a–f? (My picks: a, b, c, e.)
- [ ] **Q11** — Wire pre-commit hook (husky + lint-staged)?
- [ ] **Q12** — Path: `.claude/{agents,skills}` (Claude-Code-only) **or** `.agents/` + `.agents/skills/` (tool-agnostic, 2026-favored)?
- [ ] **Q13** — Any private context to exclude from CLAUDE.md (since it'll be checked in)?

---

## Parked

### CI menu items 5–22 (deferred)

Not implemented yet — listed so we don't forget:

- 5 — Prettier format check
- 6 — Drizzle schema-drift check (`drizzle-kit check`)
- 7 — Unit/integration tests (Vitest scaffold + sample)
- 8 — PR title lint (Conventional Commits via `amannn/action-semantic-pull-request`)
- 9 — `pnpm audit --prod` (warn-only)
- 10 — `gitleaks` secret scan
- 11 — CodeQL
- 12 — Bundle-size diff on PR
- 13 — Vercel preview deploy (confirm wired)
- 14 — Branch protection on `main`
- 15 — `.github/pull_request_template.md`
- 16 — Issue templates
- 17 — `CODEOWNERS`
- 18 — Dependabot (weekly, grouped, npm + actions)
- 19 — *(done — `.nvmrc` exists)*
- 20 — Husky + lint-staged pre-commit
- 21 — commitlint (pairs with #8)
- 22 — `CONTRIBUTING.md` + `SECURITY.md`

### Pre-existing lint warnings

- `app/(pages)/(admin)/admin/verifyStudentQR/page.tsx:142` — missing `handleVerify` dep in useEffect.
- `app/(pages)/(admin)/admin/verifyStudentQR/page.tsx:213` — raw `<img>`, prefer `next/image`.
- Same two issues mirrored in `app/(pages)/(vendorUser)/vendorUser/verifyStudentQR/page.tsx`.

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-13 | CI scope = first 4 checks only (install+cache, lint, typecheck, build). Items 5–22 parked. |
| 2026-06-13 | Node version pinned to **20 LTS** (via `.nvmrc`). |
| 2026-06-13 | `allowImportingTsExtensions: true` accepted in `tsconfig.json` — needed so `scripts/*.ts` typechecks without rewriting imports. |
| 2026-06-13 | Local lint cruft (`client/**`, `scripts/**/*.js`, `reports/**`) added to ESLint ignores rather than deleted (untracked local files). |
| 2026-06-13 | Working iteratively — one item at a time with explicit user checkpoint between items. |

---

## Sources (research snapshots, 2026-06-13)

### Bulk upload / serverless background jobs
- [Inngest — Long-running background functions on Vercel](https://www.inngest.com/blog/vercel-long-running-background-functions)
- [Inngest — What is `waitUntil` (Vercel/Cloudflare)](https://www.inngest.com/blog/vercel-cloudflare-wait-until)
- [Inngest vs Trigger.dev vs QStash (2026)](https://www.pkgpulse.com/guides/inngest-vs-triggerdev-vs-qstash-serverless-durable-2026)
- [Overcoming the 413 with pre-signed S3 URLs](https://medium.com/@saminchandeepa/overcoming-the-413-function-payload-too-large-secure-bulk-file-uploads-using-pre-signed-s3-urls-59021570c210)

### CLAUDE.md / subagents / skills (2026)
- [CLAUDE.md Best Practices: Complete 2026 Guide](https://dev.to/nishilbhave/claudemd-best-practices-the-complete-2026-guide-435j)
- [Claude Code Best Practices: 12 Patterns](https://levelup.gitconnected.com/claude-code-best-practices-12-patterns-agentic-engineers-use-65264e3eb919)
- [Best practices for Claude Code (official)](https://code.claude.com/docs/en/best-practices)
- [Claude Code Enterprise Codebases (Anthropic)](https://pasqualepillitteri.it/en/news/2794/claude-code-enterprise-codebase-anthropic-best-practices)
- [Subagents — A Practical 2026 Guide](https://nimbalyst.com/blog/claude-code-subagents-guide/)
- [A Mental Model for Skills, Subagents, and Plugins](https://levelup.gitconnected.com/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05)
- [Hooks, Subagents & Skills — Complete Guide](https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/)
- [Best Claude Code Skills in 2026](https://www.developersdigest.tech/blog/best-claude-code-skills-2026)

### CI / Next.js
- [Modern CI/CD Pipelines for Next.js 15 (2026)](https://www.untergletscher.com/en/blog/nextjs-15-cicd-best-practices-edge-deployment-2026-guide)
- [Next.js CI/CD with GitHub Actions](https://eastondev.com/blog/en/posts/dev/20251220-nextjs-cicd-github-actions/)
