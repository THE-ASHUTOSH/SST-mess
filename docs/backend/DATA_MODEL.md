# Data model

Source of truth: [`lib/db/schema.ts`](../../lib/db/schema.ts) (Drizzle). Postgres on Neon. Regenerate
migrations with `pnpm drizzle-kit generate` after editing the schema.

## Enums

- `role` — `admin` · `student` · `vendor` · `superAdmin`
- `meal_type` — `breakfast` · `lunch` · `dinner`
- `preference` — `Vegetarian` · `Non-Vegetarian` · `Eggetarian`

## Tables

### `users`
The identity for every human (and vendor account). `id` uuid PK · `email` text **unique, not null** ·
`name` not null · `role` (default `student`) · `roll` · `picture` · `batch` · `createdAt`.
> Created on first Clerk login for whitelisted domains; a vendor account is created/promoted when its
> login email is saved in Manage Vendors. Emails are effectively lowercase (Google SSO).

### `vendors`
A mess vendor. `id` uuid PK · `name` not null · **`email`** (nullable, login mapping — superAdmin-only) ·
`description` · `price` int not null · `menuUrl` · `menuId` → `menus.id` · `breakfast`/`lunch`/`dinner`
bool (default true) · `createdAt`/`updatedAt` · **`deletedAt`** (soft delete).
Indexes: partial-unique on `menuId` **where `deletedAt IS NULL`** (one active vendor per menu),
partial-unique on `email` **where `deletedAt IS NULL`** (one active vendor per login email; NULLs allowed),
and an index on `deletedAt`.

### `menus`
Weekly menu. `id` uuid PK · `monday`…`sunday` as `jsonb` `{ breakfast: string[], lunch: string[],
dinner: string[] }` · `createdAt`/`updatedAt`. Parsed from an uploaded CSV via `lib/utils/generateMenu`.

### `vendorSelections`
A student's monthly opt-in. `id` uuid PK · `userId` → `users.id` not null · `vendorId` → `vendors.id`
not null · `preference` (default Vegetarian) · `forMonth` timestamp not null (UTC month-start) ·
`dateofEntry` not null · `createdAt`.
> **One selection per user per month**, enforced by the unique index `vendor_selections_user_month_uniq`
> on `(user_id, for_month)` (migration `0010`) — which is what lets the bulk upload upsert atomically.

### `meals`
A recorded (eaten) meal. `id` uuid PK · `forUserId` → `users.id` not null (the student) ·
`byUserId` → `users.id` not null (who scanned) · `mealType` not null · `date` not null (default now).
**Unique index `(forUserId, mealType, date)`** prevents double-recording a meal.

### `vendorFeedbacks`
`id` uuid PK · `vendorId`/`userId` FKs not null · `feedback` text · `hygiene`/`quantity`/`timeliness`/
`variety`/`staff`/`overall` int not null (ratings) · `date` default now.

### `controls`
Feature flags. `id` uuid PK · `name` unique not null · `enabled` bool (default false). e.g. the
`feedbackToggle` row gates the student feedback window.

## Relationships (ERD)

```
users ──< meals >── (byUser) users
    │        (forUser) ↑
    ├──< vendorSelections >── vendors ──> menus
    └──< vendorFeedbacks  >── vendors
```

- `users` 1─N `vendorSelections`, `vendorFeedbacks`, `meals` (as eater and as scanner).
- `vendors` 1─N `vendorSelections`, `vendorFeedbacks`; `vendors` N─1 `menus` (one active vendor per menu).
- `meals.byUserId` is the vendor user who scanned; `meals.forUserId` is the student.

## Conventions

- **UUID PKs** (`defaultRandom()`), **timestamps** default `now()`.
- **Soft delete** only on `vendors` (`deletedAt`); everything else is hard data preserved for history.
- **Months** are stored/compared in **UTC** (`forMonth` = month-start at `00:00:00Z`).
- **Column privacy:** `vendors.email` must never reach a non-superAdmin — see
  [CONVENTIONS.md](./CONVENTIONS.md#database--writes).
