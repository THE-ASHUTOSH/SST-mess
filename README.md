# SST Mess Management System

Internal tool for Scaler's hostel mess. Students **opt in** to a vendor each month, generate a
time-boxed **QR code** per meal, and vendors **scan** it to record the meal. Admins and superAdmins
manage vendors, menus, monthly opt-ins, analytics, and system controls.

**Roles:** `student` · `vendor` · `admin` · `superAdmin` (a superset of admin).

## Tech stack

Next.js 15 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/Radix UI ·
Clerk (Google SSO) · Drizzle ORM + Neon (serverless Postgres) · pnpm · Node 20 · Vercel.

## Getting started

**Prerequisites:** Node 20+, pnpm (`npm i -g pnpm`).

```bash
pnpm install
```

Create `.env.local` with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=            # Neon Postgres connection string
JWT_SECRET_KEY=          # signs the meal QR tokens (HS256)
```

Common commands:

```bash
pnpm dev          # dev server → http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm drizzle-kit generate --name <desc>   # create a migration after editing lib/db/schema.ts
pnpm drizzle-kit migrate                  # apply migrations
```

> **New here?** [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) walks you through a seeded local dev
> environment (on a Neon dev branch) where you can explore the app as every role.

## Documentation

| Doc | What's in it |
|---|---|
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | New-dev setup: Neon dev branch, env, migrate, **seed**, and viewing every role |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System overview, stack, auth flow, core meal flow, deploy notes |
| [docs/backend/CONVENTIONS.md](./docs/backend/CONVENTIONS.md) | Route patterns: roles/access, error mapping, validation, DB/writes, caching, migrations |
| [docs/backend/API.md](./docs/backend/API.md) | Endpoint reference (request/response for every route) |
| [docs/backend/DATA_MODEL.md](./docs/backend/DATA_MODEL.md) | Tables, enums, relationships (ERD), and data conventions |
| [docs/frontend/FRONTEND.md](./docs/frontend/FRONTEND.md) | App Router routing, layout shell, nav config, guards, contexts, UI kit |
| [docs/user/USER_DOCUMENTATION.md](./docs/user/USER_DOCUMENTATION.md) · [docs/user/SOP.md](./docs/user/SOP.md) | End-user guide & standard operating procedures |
| [CLAUDE.md](./CLAUDE.md) | Conventions & rules for AI-assisted development |

## Project layout (short)

```
app/(pages)/(student|admin|vendorUser)/…   role-grouped UI
app/api/{admin,meal,vendor,user,controls}/… route handlers (backend)
components/{ui,common,features}             shadcn kit + shared components
context/                                     UserContext (session→role), DashboardContext
lib/                                         db client, db/schema.ts, auth-helper, domain helpers
drizzle/                                     generated SQL migrations
docs/                                        this documentation
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full map.
