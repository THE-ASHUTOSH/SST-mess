<!--
Title = Conventional Commits, e.g. `feat(menu): add per-day editor` or `fix(qr)!: drop vendorId from verify-qr`.
It becomes the squash commit on main. See docs/CONTRIBUTING.md.
-->

## What & why

<!-- One or two sentences. Link the issue: "Closes #123". -->

## How to test

<!-- Steps a reviewer can follow locally (role to log in as, page, expected result). Screenshots for UI. -->

## API / mobile impact

<!-- The mobile app uses the same API. Delete the ones that don't apply. -->
- [ ] No API change
- [ ] Additive only (new endpoint or field)
- [ ] **Breaking** (removed/renamed endpoint, field, or param) — described in `docs/backend/API.md`, title has `!`

## Database

- [ ] No schema change
- [ ] Migration added via `lib/db/schema.ts` → `pnpm db:generate` (SQL reviewed)
- [ ] **Destructive** (`DROP`, data rewrite) — rollout order + backup plan written below

## Checklist

- [ ] `pnpm typecheck` and `pnpm lint` pass (no new warnings)
- [ ] New handlers call `requireRole` first; no `vendors.email` exposed to non-superAdmins
- [ ] Docs / nav updated for anything moved or removed
- [ ] No secrets, `.env*` files, or real student data
