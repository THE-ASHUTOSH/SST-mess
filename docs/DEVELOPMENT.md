# Development environment

How a new developer gets a **safe, isolated** local setup with realistic data and can explore the app
as **every role** — without touching production. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the big picture.

## The golden rule

Local dev talks to a **Postgres container on your own machine**, never a shared or production
database. Production credentials live only in the deploy environment's settings. The seed script
**wipes and repopulates** whatever `DATABASE_URL` points at — it refuses to run against a non-local
host, but keep `.env.local` pointed at the container anyway.

## First-time setup

**Prerequisites:** Node 20+, pnpm (`npm i -g pnpm`), and **Docker Desktop** (running).

1. **Create `.env.local`** from the template:
   ```bash
   cp .env.example .env.local
   ```
   The `DATABASE_URL` in the template already matches the container — leave it alone. Fill in the
   Clerk **Development** instance keys (`pk_test_…` / `sk_test_…`, not Production), a random
   `JWT_SECRET_KEY`, and **`DEV_SEED_EMAIL` = your own login email** (this becomes your superAdmin).

2. **Run the whole setup in one command:**
   ```bash
   pnpm setup      # install → start Postgres → migrate → seed
   pnpm dev        # http://localhost:3000
   ```
   Sign in with the Google account matching `DEV_SEED_EMAIL` — you land in the **superAdmin** portal.

   `./dev.sh` does the same thing with an interactive menu (bash only — Git Bash on Windows).

The seed creates 2 vendors (+ menus), 1 admin, 2 vendor users, 6 students, this month's opt-ins,
some recorded meals, and opens the feedback window.

## The database

A single `postgres:17-alpine` container defined in [`docker-compose.yml`](../docker-compose.yml).
Credentials are deliberately trivial (`mess` / `mess` / `mess_dev`) because it only listens on your
machine.

| Command | What it does |
|---|---|
| `pnpm db:up` | Start the container and wait until it accepts connections |
| `pnpm db:down` | Stop it, **keeping** the data |
| `pnpm db:migrate` | Apply pending migrations (`drizzle-kit migrate`) |
| `pnpm db:seed` | Wipe + reseed demo data |
| `pnpm db:reset` | Delete the volume and rebuild from zero: fresh DB → migrate → seed |
| `pnpm db:psql` | Open a `psql` shell inside the container |
| `pnpm db:studio` | Drizzle Studio — a browser table editor |
| `pnpm db:logs` | Tail the Postgres logs |
| `pnpm db:check` | Verify the TLS/connection-option logic in `lib/db/pg.ts` |

Data lives in a named Docker volume (`sst-mess_mess-pgdata`), so it survives restarts and reboots.
**Only `pnpm db:reset` / `docker compose down -v` deletes it.**

> `sslmode=disable` in the URL is **required**: the container speaks no TLS, and without it `pg`
> opens with an SSLRequest and fails with *"server does not support SSL connections"*.
> [`lib/db/pg.ts`](../lib/db/pg.ts) turns TLS off for local hosts and leaves it on (verification
> relaxed) for remote ones, so the same code works against both.

## Explore every role

Clerk gives you a **single login** (one identity → one role), so to see the other portals you
**change your own `role` in the local database**, then refresh. Two equivalent ways:

**Option 1 — the `set-role` script:**

```bash
pnpm tsx scripts/set-role.ts you@scaler.com student      # then: admin / vendor / superAdmin
```

**Option 2 — SQL directly.** `pnpm db:psql` drops you into the database, then:

```sql
UPDATE users SET role = 'student' WHERE lower(email) = 'you@scaler.com';
-- role is one of: 'student' | 'vendor' | 'admin' | 'superAdmin'
\q
```

Refresh the browser and you're in that portal. This is safe because it's **your own container**.

| Role | What you'll see |
|---|---|
| `superAdmin` | Everything — Manage Vendors, Upload Selection, Verify QR, Controls (User Mgmt + Vendor Directory), analytics |
| `admin` | Update Menu, Choice/Feedback Analysis, Controls, Total Meals |
| `vendor` | Scanner + Total Meals scoped to the vendor your email maps to (none by default — see note) |
| `student` | Dashboard + meal QR, vendors/menu, feedback, meal history |

> **Your dev account is superAdmin only** — it is deliberately **not** a vendor. The demo vendors have
> their own login emails (`demo-vendor-a@…`, `demo-vendor-b@…`), already seeded as `vendor` accounts
> and linked.
>
> Previewing the **vendor** portal takes one deliberate step, because Manage Vendors only offers
> accounts that already have role `vendor`, and the API blocks changing your *own* role (self-lockout
> guard). Either:
>
> 1. **Use a second Google account** on an allowed domain — add it under **Admin Controls → User
>    Management** as `vendor`, then pick it in **Manage Vendors**; or
> 2. **Flip your own role in the DB** (`pnpm db:psql` or `set-role.ts` — not via the API), then link
>    your email to a demo vendor.
>
> Without a vendor mapped to your email, the vendor portal shows "no vendor linked to your account."

> **Signing in no longer creates an account.** A `users` row *is* the authorization, so an email that
> isn't seeded lands on `/noAccess`. If you sign in with an address the seed doesn't know, add it via
> User Management from a superAdmin session (or re-seed with that email as `DEV_SEED_EMAIL`).

## Migrations

Changing the database is always these four steps:

```bash
# 1. edit lib/db/schema.ts
pnpm db:generate --name <desc>   # 2. writes drizzle/NNNN_<desc>.sql + a snapshot
#    3. review the generated SQL, then commit it
pnpm db:migrate                  # 4. apply it
```

`pnpm db:migrate` is the only way to apply a schema change. It runs the reviewed SQL files in
`drizzle/` in order and records each one, so every environment converges on the same schema and a
second run is a no-op.

Never hand-edit a migration that has already been applied — history is append-only. Correct a
mistake with a new migration.

Because the local DB is disposable, the honest way to test a migration is `pnpm db:reset`: it
replays the entire chain from an empty database, which is what a fresh environment will do.

## Reset

```bash
pnpm db:seed     # back to clean demo data, same database
pnpm db:reset    # nuke the volume entirely, then migrate + seed from scratch
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `server does not support SSL connections` | `sslmode=disable` missing from `DATABASE_URL` |
| `ECONNREFUSED 127.0.0.1:5432` | Container isn't up — `pnpm db:up` (and check Docker Desktop is running) |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Something else holds 5432. Either stop it, or `POSTGRES_PORT=5433 pnpm db:up` and change the port in `DATABASE_URL` to match |
| `password authentication failed for user "mess"` | A stale volume from an older password — `pnpm db:reset` |
| `relation "users" does not exist` | Migrations not applied — `pnpm db:migrate` |
| App loads but every page is `/noAccess` | Your Clerk login email has no `users` row — set `DEV_SEED_EMAIL` and re-run `pnpm db:seed` |
| Anything else DB-shaped | `pnpm tsx scripts/check-db.ts` prints connectivity, table shape, enum values and applied migrations |

## Notes

- Scripts run with the local `tsx`: `pnpm tsx scripts/<file>.ts`.
- Verifying a real meal QR needs the correct meal-time window (see `lib/utils/timezone`); if "Wrong meal
  time" appears, that's expected outside breakfast/lunch/dinner hours.
