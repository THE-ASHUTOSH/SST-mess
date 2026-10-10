# CLAUDE.md

Operating guide for AI assistants and developers in this repo. **Keep it short and current** — deep
detail lives in [`docs/`](./docs/ARCHITECTURE.md). These rules override default behavior; when a rule
here conflicts with older code, the rule wins — fix the code.

## Project

SST Mess Management — an internal Scaler tool where students opt into a mess vendor each month, generate
a per-meal QR, and vendors scan it to record meals. Admins/superAdmins manage vendors, menus, opt-ins,
analytics, and system controls.

**Stack:** Next.js 15 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/Radix UI ·
Recharts · Drizzle ORM + Postgres (`drizzle-orm/node-postgres`) · Clerk auth · pnpm · Node 20 · Vercel.
Local DB is a Docker container ([`docker-compose.yml`](./docker-compose.yml)) — see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Commands

```bash
pnpm dev            # local dev (Turbopack)
pnpm build          # production build
pnpm typecheck      # tsc --noEmit   ┐ both MUST be clean before a change is "done"
pnpm lint           # ESLint         ┘
pnpm setup          # first run: install → start Docker Postgres → migrate → seed
pnpm db:up          # start the local Postgres container (docker-compose.yml)
pnpm db:reset       # nuke the local volume, then migrate + seed from scratch
pnpm db:psql        # psql shell into the container
pnpm db:generate --name <desc>   # create a migration after editing lib/db/schema.ts
pnpm db:migrate                   # apply migrations (uses DATABASE_URL)
pnpm tsx scripts/<file>.ts        # run an ops script
./dev.sh                          # same bootstrap with an interactive menu (bash / Git Bash only)
```

## Where things live

- `app/(pages)/(student|admin|vendorUser)/…` — role-grouped UI (the `(group)` folders don't affect the
  URL). Page-route folders are **camelCase** (e.g. `manageStudents`, `updateMenu`) — match existing siblings.
- `app/api/**` — route handlers (backend). API path segments are **kebab-case** (e.g. `upload-vendor-selection`).
- `lib/db/schema.ts` — Drizzle schema · `lib/auth-helper.ts` — `getDbUser`/`requireRole` · `middleware.ts`
  — API auth gate. **Treat these three as sensitive; read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) first.**
- `components/ui/*` — shadcn primitives · `components/common/*` — shared app components (`MultiSelect`,
  `PageHeader`, …) · `lib/axiosInstance.ts` — the only client→API transport · `lib/dashboard/navigation.ts`
  — sidebar + dashboard cards (role-gated) · `lib/vendor-scope.ts` — `getVendorForEmail`.
- Key admin surfaces: `/admin/manageStudents` (student directory + bulk selection upload),
  `/admin/analytics` (vendor demand + meals served, charts), `/admin/manageVendor`, `/admin/adminControls`.
- Docs: [ARCHITECTURE](./docs/ARCHITECTURE.md) · [backend/CONVENTIONS](./docs/backend/CONVENTIONS.md) ·
  [backend/API](./docs/backend/API.md) · [backend/DATA_MODEL](./docs/backend/DATA_MODEL.md) ·
  [frontend/FRONTEND](./docs/frontend/FRONTEND.md) · [DEVELOPMENT](./docs/DEVELOPMENT.md).

## Rules

### Golden — never violate
1. **Never `git add`, stage, commit, or push unless the maintainer explicitly asks.** Make the edits, run
   the checks, report — leave all git operations to them. Never push to `main`.
2. **Never commit secrets** — `.env*`, `DATABASE_URL`, Clerk keys, `JWT_SECRET_KEY`.
3. **You MUST run `pnpm typecheck` and `pnpm lint`, both clean (no new warnings), before calling a change
   done** — and report the result honestly (if something fails or was skipped, say so).
4. **Confirm before anything outward-facing or hard to reverse** — deploys, destructive DB ops, external
   calls, `DROP COLUMN`. Approval in one context doesn't extend to the next.

### Auth & access control (details: [CONVENTIONS.md](./docs/backend/CONVENTIONS.md))
5. Gate every non-public handler with `requireRole([...])` on its **first line**. Resolve identity/role
   from the session (`getDbUser`) — **never** trust a client-supplied `userId`/`role`/`vendorId` for authz.
6. `superAdmin` is a superset (passes every check) — list only the non-super roles that need access; never
   put `'superAdmin'` in the array.
7. **Vendor scoping:** a `vendor` user may act only on their own vendor — resolve it server-side from the
   session email (`getVendorForEmail`) and ignore any client `vendorId`.
8. UI guards (`RequireRole`, nav `roles`) are cosmetic; the API `requireRole` is the real boundary. Gate
   both, but trust only the API.

### Data exposure
9. **Never expose `vendors.email` to a non-superAdmin.** Exclude it from relations (`columns:{email:false}`)
   and from any `.select()`/`.returning()` that reaches a non-superAdmin response; analytics/charts select
   `vendors.id`/`name` only.

### Backend / DB access (details: [CONVENTIONS.md](./docs/backend/CONVENTIONS.md))
10. No N+1: preload with one query → diff in memory → chunked bulk write (≤500 rows/chunk; mind Postgres'
    ~65k bind-param cap). Validate + bound all input; reject oversized/ malformed with a clean `400`.
11. **List endpoints paginate + filter in SQL** (`limit`/`offset` + a matching `count`) — never load a
    whole table to page in memory.
12. `drizzle-orm/node-postgres` **has** `db.transaction(async (tx) => …)` — use it for atomic multi-write.
    Keep them short (the pool is 5/instance). Pre-swap handlers instead order writes defensively + rely on
    unique indexes + `onConflictDoNothing`/`onConflictDoUpdate`; that's still fine, don't churn it.
13. Bucket months in **UTC**; lowercase emails and match case-insensitively (`lower(users.email)`);
    validate UUIDs → `400`; soft-delete vendors (`deletedAt`) and always filter `isNull(deletedAt)`.
14. Invalidate caches on writes: `revalidateTag('meal-history')` when opt-ins change, `revalidateTag('vendors')`
    when vendors change. Return friendly messages; log full errors server-side, never leak internals.

### Schema & migrations
15. Change the DB **only** via `lib/db/schema.ts` → `pnpm db:generate` → review the SQL → commit.
    Never hand-edit generated migrations. `DROP COLUMN` is irreversible — confirm nothing depends on it (see #4).

### Frontend & charts (details: [FRONTEND.md](./docs/frontend/FRONTEND.md))
16. Client→API calls go through `lib/axiosInstance.ts`. Build UI from `components/ui`; reuse
    `components/common` before adding a new component. Use theme **tokens** (`text-foreground`, `bg-card`,
    `var(--border)`…), never raw colors — dark mode is class-based (`.dark`) so tokens switch automatically.
    Toasts via `sonner`. Components PascalCase.
17. **Charts (Recharts):** text/grid/tooltip use theme tokens; data marks use **validated categorical
    palettes** (see `/admin/analytics`) — assign hues by entity in a fixed order, never cycled; one y-axis
    only; ship a legend + a table view + selective direct labels so identity is never color-alone; validate
    any new palette for **both** light and dark before use.

### Working style
18. Work **one item at a time with explicit checkpoints**; don't batch unrelated changes. Prefer editing
    existing files over adding new; keep new folders consistent with their neighbors; put new docs under `docs/`.
19. When merging/removing pages, also update `lib/dashboard/navigation.ts`, the dashboard cards, and the
    relevant `docs/` — and check for dangling route references.
20. When asked to commit or open a PR: branch `<type>/<name>`, and write the commit / **PR title** as
    [Conventional Commits](./docs/CONTRIBUTING.md) — `type(scope): subject` (`feat`, `fix`, `docs`,
    `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; `!` = breaking, e.g. a removed API
    field). PRs are squash-merged, so the title is what lands on `main`. Fill the PR template's
    API/mobile-impact and Database sections.

## Definition of done
- [ ] `pnpm typecheck` clean · `pnpm lint` clean (0 new warnings)
- [ ] Every new handler gated by `requireRole` on line 1; no `vendors.email` leak; no client-trusted authz
- [ ] DB changes went schema → `generate` → reviewed SQL; caches revalidated after writes
- [ ] Nav/docs updated for any moved/removed surface; no dangling references
- [ ] Nothing staged or committed; outward-facing/destructive steps confirmed with the maintainer
