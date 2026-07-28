# Development environment

How a new developer gets a **safe, isolated** local setup with realistic data and can explore the app
as **every role** — without touching production. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the big picture.

## The golden rule

Local dev talks to a **Neon dev branch**, never the production database. Production credentials live
only in Vercel's environment settings. The seed script **wipes and repopulates** whatever `DATABASE_URL`
points at, so keep `.env.local` pointed at your dev branch.

## First-time setup

1. **Create a Neon dev branch.** In the Neon console, branch off `main` (copy-on-write, isolated data)
   and copy its connection string. This is your personal dev DB — reset or reseed it freely.

2. **Use the Clerk *Development* instance.** Grab the `pk_test_…` / `sk_test_…` keys from Clerk's
   Development instance (not Production).

3. **Create `.env.local`** from the template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   Set `DATABASE_URL` to your **dev branch**, the Clerk dev keys, a random `JWT_SECRET_KEY`, and
   **`DEV_SEED_EMAIL` to your own login email** (this becomes your superAdmin + a demo vendor).

4. **Install & migrate:**
   ```bash
   pnpm install
   pnpm drizzle-kit migrate     # applies drizzle/*.sql to your dev branch
   ```

5. **Seed demo data:**
   ```bash
   npx tsx scripts/seed.ts --yes
   ```
   It prints the target host first — confirm it's your dev branch. It creates 2 vendors
   (+ menus), 1 admin, 1 vendor user, 6 students, this month's opt-ins, some recorded meals, and opens
   the feedback window.

6. **Run it:**
   ```bash
   pnpm dev        # http://localhost:3000
   ```
   Sign in with the Google account matching `DEV_SEED_EMAIL` — you land in the **superAdmin** portal.

## Explore every role

Clerk gives you a **single login** (one identity → one role), so to see the other portals you simply
**change your own `role` in the dev database**, then refresh the app. Two equivalent ways:

**Option 1 — SQL in the Neon console.** Open your dev branch → SQL editor and run:

```sql
UPDATE users SET role = 'student' WHERE lower(email) = 'you@scaler.com';
-- role is one of: 'student' | 'vendor' | 'admin' | 'superAdmin'
```

**Option 2 — the `set-role` script** (a thin wrapper for the same update):

```bash
npx tsx scripts/set-role.ts you@scaler.com student      # then: admin / vendor / superAdmin
```

Refresh the browser and you're in that portal. This is safe because it's **your dev branch** — never do
this on production.

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
> Previewing the **vendor** portal now takes one deliberate step, because Manage Vendors only offers
> accounts that already have role `vendor`, and the API blocks changing your *own* role (self-lockout
> guard). Either:
>
> 1. **Use a second Google account** on an allowed domain — add it under **Admin Controls → User
>    Management** as `vendor`, then pick it in **Manage Vendors**; or
> 2. **Flip your own role in the DB** (SQL or a one-off script — not via the API), then link your
>    email to a demo vendor.
>
> Without a vendor mapped to your email, the vendor portal shows "no vendor linked to your account."

> **Signing in no longer creates an account.** A `users` row *is* the authorization, so an email that
> isn't seeded lands on `/noAccess`. If you sign in with an address the seed doesn't know, add it via
> User Management from a superAdmin session (or re-seed with that email as `DEV_EMAIL`).

## Reset

Re-run the seed any time to get back to a clean state (`npx tsx scripts/seed.ts --yes`). To wipe your
dev branch entirely, reset the branch in the Neon console and re-run migrate + seed.

## Notes

- Scripts run with `tsx` (no global needed): `npx tsx scripts/<file>.ts` (or `pnpm dlx tsx …`).
- Migrations: edit `lib/db/schema.ts` → `pnpm drizzle-kit generate` → `pnpm drizzle-kit migrate`.
  See [backend/CONVENTIONS.md](./backend/CONVENTIONS.md#migrations).
- Verifying a real meal QR needs the correct meal-time window (see `lib/utils/timezone`); if "Wrong meal
  time" appears, that's expected outside breakfast/lunch/dinner hours.
