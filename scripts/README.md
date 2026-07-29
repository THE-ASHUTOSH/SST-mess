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

### `seed-bulk-users.ts` — bulk load-test students
Inserts N dummy students (default 3000, chunked/idempotent) and, after insertion, saves their emails to
`fixtures/bulk-emails.csv` (tracked, in the project) so you can exercise the vendor-selection bulk upload —
speed and every case (to-create / duplicates / not-found / invalid / over-limit). The CSV works for both
the file-upload and paste paths.

```bash
npx tsx scripts/seed-bulk-users.ts 3000 --yes
```

### `import-students.ts` — roster import (real student data)
Bulk-inserts students from a CSV/XLSX roster (`email,name,batch`). The roster is the source of truth for
students — `/api/admin/users` deliberately can't create them — so this is how a student row comes into
existence. **Strictly additive:** the only statement it issues is `INSERT … ON CONFLICT DO NOTHING`, with
no `UPDATE`/`DELETE` anywhere, so existing rows are never touched and re-running is a no-op.

```bash
npx tsx scripts/import-students.ts "C:/path/to/students_batch_2024.csv"          # dry run (default)
npx tsx scripts/import-students.ts "C:/path/to/students_batch_2024.csv" --yes    # commit
```

Emails are lowercased and matched against `lower(users.email)` before inserting, so a stored mixed-case
address still counts as a duplicate. Skipped rows are written to `scripts/out/<file>-rejects.csv` with a
reason. Flags: `--role` (default `student`; `superAdmin` refused), `--batch`/`--force-batch`, `--no-roll`,
`--tidy-names`, `--rejects <path>`.

## Safety

These scripts print the **target database host** before acting — verify it's your **dev branch**, never
production. `seed.ts` refuses to run without `--yes` (or `SEED_CONFIRM=1`) because it deletes data;
`import-students.ts` defaults to a dry run and needs `--yes` to write anything.
