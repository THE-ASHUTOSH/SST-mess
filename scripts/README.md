# scripts/

Command-line helpers, run with `tsx` (e.g. `npx tsx scripts/<file>.ts`).

> Most files in this folder are **local/experimental ops scripts and are gitignored**. Only the shared
> onboarding scripts below are tracked (see `.gitignore`).

## Tracked (shared) scripts

### `seed.ts` — dev database seed
Wipes and repopulates the domain tables with demo data across every role, so a new dev can explore the
whole app. **Reads `DATABASE_URL` from `.env.local` and requires confirmation.**

```bash
npx tsx scripts/seed.ts --yes
```

Needs `DEV_SEED_EMAIL` set in `.env.local` (your login email — becomes the superAdmin + a demo vendor).
Full walkthrough: [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md).

### `set-role.ts` — change a user's role
The dev role-switcher (explore each portal) and the first-superAdmin bootstrap.

```bash
npx tsx scripts/set-role.ts <email> <student|vendor|admin|superAdmin>
```

## Safety

Both scripts print the **target database host** before acting — verify it's your **dev branch**, never
production. `seed.ts` refuses to run without `--yes` (or `SEED_CONFIRM=1`) because it deletes data.
