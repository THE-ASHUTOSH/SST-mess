# Architecture

High-level map of the SST Mess Management system. For deeper detail see
[backend/CONVENTIONS.md](./backend/CONVENTIONS.md) and [frontend/FRONTEND.md](./frontend/FRONTEND.md).

## What it is

An internal tool for Scaler's hostel mess: students **opt in** to a vendor each month, generate a
time-boxed **QR code** per meal, and vendors **scan** it to record the meal. Admins/superAdmins manage
vendors, menus, monthly opt-ins, analytics, and system controls.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) · React 19 |
| Styling / UI | Tailwind CSS v4 · shadcn-style Radix primitives (`components/ui`) |
| Auth | Clerk (Google SSO), domain-whitelisted to `sst.scaler.com` / `scaler.com` |
| DB / ORM | Neon (serverless Postgres) · Drizzle ORM (`drizzle-orm/neon-http`) |
| Runtime | Node 20 · pnpm · deployed on Vercel |

## Roles

Four roles (`role` enum on `users`): **`student`**, **`vendor`**, **`admin`**, **`superAdmin`**.
`superAdmin` is a **superset** — it passes every permission check. `admin` is a reduced tier. The
authoritative access matrix and enforcement live in [backend/CONVENTIONS.md](./backend/CONVENTIONS.md#roles--access).

## Directory layout

```
app/
  (pages)/(student|admin|vendorUser)/...   → role-grouped UI (App Router route groups)
  (pages)/login/...                        → Clerk sign-in + role-based redirect
  api/{admin,meal,vendor,user,controls}/…  → route handlers (the backend)
components/    → ui/ (shadcn kit) + common/ (layout, shells) + features/
context/       → UserContext (session→role), DashboardContext
lib/           → db.ts (Drizzle client), db/schema.ts, auth-helper.ts, utils, domain helpers
drizzle/       → generated SQL migrations + snapshots
scripts/       → local ops scripts (gitignored cruft; run via tsx)
docs/          → this documentation
```

## Auth flow

1. User signs in with Google via Clerk. `middleware.ts` runs `auth.protect()` on every `/api/*`
   route, so unauthenticated API calls never reach a handler.
2. `lib/auth-helper.ts:getDbUser()` resolves the Clerk session → a `users` row (creating a
   `student` row on first login **only** for whitelisted domains). The user's role comes from the DB,
   never from client input.
3. **APIs** gate with `requireRole([...])`; **pages** gate client-side with `Protected` (shell) and
   `RequireRole` (per-page). See [frontend/FRONTEND.md](./frontend/FRONTEND.md#guards).

## Core data flow (a meal)

```
Student opts in (vendorSelections: user + vendor + month)   ← bulk upload / script, superAdmin
        │
        ▼
Student opens dashboard → GET /api/meal/generate-qr
        │  (checks: opted in this month? vendor offers this meal? not already eaten?)
        ▼  returns a 30s HS256 JWT { userId, vendorId }
Vendor scans QR → POST /api/meal/verify-qr
        │  (vendor is pinned to THEIR vendor by login email; QR's vendorId must match;
        │   student opted in this month; correct meal window; not a duplicate today)
        ▼
meals row inserted (forUserId, byUserId, mealType, date)
        │
        ▼
Totals & analytics: /api/meal/total-meals, /api/vendor/choice-analysis, feedback-analysis
```

Key domain tables: `users`, `vendors`, `menus`, `vendorSelections`, `meals`, `vendorFeedbacks`,
`controls`, `hostels`. Full schema in [backend/DATA_MODEL.md](./backend/DATA_MODEL.md).

## Vendor accounts

A `vendors` row carries a superAdmin-managed **login email**. Saving that email in Manage Vendors
creates/promotes the matching `users` row to `vendor`. On login, that account is **scoped to its own
vendor** — the scanner and stats resolve the vendor server-side from the session email and ignore any
client-supplied `vendorId`, so one vendor can never act on another's students or stats.

## Caching

Read-heavy endpoints use `unstable_cache` with tags; mutations call `revalidateTag`:
- `vendors` tag — vendor list (`getVendors`), busted by vendor create/update/delete.
- `meal-history` tag — per-user meal history (10-day TTL), busted by the vendor-selection upload.

## Deploy notes

- **neon-http driver has no interactive transactions** — multi-statement writes are ordered defensively
  and/or guarded by unique indexes instead. See [CONVENTIONS.md](./backend/CONVENTIONS.md#database--writes).
- Vercel serverless: ~4.5 MB request body cap; function timeout (10 s Hobby / higher on Pro). Bulk
  endpoints are capped accordingly (see the upload limits in [backend/API.md](./backend/API.md)).
- Migrations are generated with `pnpm drizzle-kit generate` and applied with `pnpm drizzle-kit migrate`.
