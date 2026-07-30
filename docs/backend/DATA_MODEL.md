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
> **Never created on login.** A row here *is* the authorization to use the app, so sign-in only ever
> reads it (`lower(users.email)`). admin/superAdmin/vendor rows come from `POST /api/admin/users`
> (superAdmin only, allowed domains only); students are loaded out of band. Every user has exactly
> one `role`. Emails are stored lowercased.

### `menu_days`
One vendor's menu for one calendar day. `id` uuid PK · **`vendorId`** → `vendors.id` (`ON DELETE CASCADE`) ·
**`date`** `date` not null (plain calendar date in **IST**, never a timestamp — that is what stops "today"
differing between an admin in Kolkata and a server elsewhere) · `breakfast`/`lunch`/`dinner` jsonb
`string[]` **not null default `'[]'`** · `createdAt`/`updatedAt`.
Indexes: unique on **(`vendorId`, `date`)** — one menu per vendor per day, which lets the editor upsert
with no read-then-write race — plus an index on `date` for the window read and the retention delete.

> **Replaces the recurring weekly `menus` table.** The admin edits an explicit rolling window
> (`MENU_WINDOW_DAYS` = 15, starting today) rather than a pattern that repeats forever, so the same
> weekday can differ week to week. The window is **derived, never stored**: a date with no row is
> served as an empty editable day and becomes a row on first save, so the far end grows automatically
> as the near end falls away — no scheduled job keeps the count at 15. Days older than
> `MENU_RETENTION_DAYS` (2) are hard-deleted on write. `menus` / `vendors.menuId` are no longer read
> and can be dropped in a later migration.

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
