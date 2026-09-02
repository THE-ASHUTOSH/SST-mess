# Backend conventions

Patterns every API route handler (`app/api/**/route.ts`) should follow. See also
[API.md](./API.md) (endpoint reference) and [DATA_MODEL.md](./DATA_MODEL.md).

## Roles & access

Roles: `student`, `vendor`, `admin`, `superAdmin`. Gate every non-public handler on its **first line**:

```ts
const user = await requireRole(['admin']); // lib/auth-helper.ts
```

- `requireRole` throws `Error('Unauthorized')` (→ 401) if not logged in, `Error('Forbidden')` (→ 403)
  if the role isn't allowed. Map these in your `catch` (see [Error mapping](#error-mapping)).
- **`superAdmin` is a superset** — `requireRole` returns early for it, so it passes *every* check
  without being listed. Only list the *non-super* roles that should have access.
- The acting user's identity/role comes from the **Clerk session** (`getDbUser`), never from the
  request body/query. Never trust a client-supplied `userId`/`role`/`vendorId` to decide authorization.

Current access map:

| Capability | student | vendor | admin | superAdmin |
|---|:--:|:--:|:--:|:--:|
| Generate QR / own meal history | ✅ | | | ✅ |
| Verify QR (scanner) | | ✅ (own vendor) | | ✅ |
| Total Meals | | ✅ (own vendor) | ✅ | ✅ |
| Update Menu | | | ✅ | ✅ |
| Choice / Feedback analysis, Controls | | | ✅ | ✅ |
| Manage Vendors, Upload Selection, User admin | | | | ✅ |

Vendor-scoped endpoints (`verify-qr`, `total-meals`) resolve the caller's vendor with
`getVendorForEmail(user.email)` (`lib/vendor-scope.ts`) and **ignore any client `vendorId`** for
`vendor` role. superAdmin/admin may target any vendor.

## Error mapping

Return JSON `{ success, message }` and correct status codes; never leak raw internals:

```ts
} catch (error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ success:false, message:'Unauthorized' }, { status:401 });
    if (error.message === 'Forbidden')    return NextResponse.json({ success:false, message:'Forbidden' }, { status:403 });
  }
  console.error('…failed:', error);            // full detail server-side only
  return NextResponse.json({ success:false, message:'…generic…' }, { status:500 });
}
```

Use a typed sentinel error (e.g. `class VendorFormError extends Error {}`) for **validation** failures
so they map to `400` distinctly from server errors.

## Input validation

- Validate UUIDs before querying (`uuid` columns throw a Postgres `22P02` → 500 otherwise). Reject with
  `400` up front (`isUuid` regex).
- Parse `?month=YYYY-MM` to a **UTC** month-start (`new Date(\`${m}-01T00:00:00.000Z\`)`) — the app buckets
  by UTC everywhere; local parsing drifts across hosts.
- Lowercase emails before compare/store; match users case-insensitively (`lower(users.email)`), since
  Clerk stores the address verbatim.
- **Bound bulk input.** The selection upload caps at `MAX_UPLOAD_EMAILS` (10k) + 5 MB — reject larger with
  a clean `400` rather than hitting Postgres' ~65k bind-parameter limit / a timeout / OOM.

## Database & writes

- Driver is **`drizzle-orm/node-postgres`**, which **does** support interactive transactions — use
  `await db.transaction(async (tx) => { … })` for a multi-statement write that must be all-or-nothing
  (see `app/api/admin/upload-vendor-selection/commit/route.ts`). Keep transactions short: they hold a
  pooled connection, and `lib/db.ts` caps the pool at 5 per instance.
- Handlers written before the driver swap instead order writes so the last statement is the "commit"
  (e.g. create the menu, then insert the vendor with its `menuId`) and lean on unique indexes +
  `onConflictDoNothing`. That remains correct — don't churn it — but new code can just use a transaction.
- **No N+1.** For bulk work: preload with one `inArray(...)` query → diff in memory → chunked bulk
  `insert`/`update` (chunk ≤ 500 rows; watch the 65k param ceiling on non-chunked `inArray`).
- **Soft delete** vendors (`deletedAt`), never hard delete — FKs from `meals`/`vendorSelections`/
  `vendorFeedbacks` stay valid and history is preserved. Filter `isNull(deletedAt)` on reads.
- Column privacy: `vendors.email` is superAdmin-only. Exclude it from any relation loaded for a
  non-superAdmin (`with: { vendor: { columns: { email: false } } }`) and from `.returning()`/`.select()`
  that reaches a non-superAdmin response.

## Caching & revalidation

- Wrap read-heavy queries in `unstable_cache(fn, keyParts, { tags, revalidate })`. Put per-user data
  behind a per-user key part.
- After any mutation that changes cached data, call `revalidateTag(tag)`. Current tags: `vendors`,
  `meal-history`.

## Migrations

1. Edit `lib/db/schema.ts`.
2. `pnpm drizzle-kit generate --name <desc>` → new `drizzle/NNNN_*.sql` + snapshot.
3. Review the SQL, commit it.
4. Apply with `pnpm drizzle-kit migrate` (uses `DATABASE_URL`). **Destructive migrations (DROP COLUMN)
   are irreversible** — check no live data/consumer depends on the column first.

## Don't-touch-without-care

`lib/db/schema.ts`, `middleware.ts`, `lib/auth-helper.ts` (auth + provisioning) — changes here affect
security/data globally. Read [ARCHITECTURE.md](../ARCHITECTURE.md) first and prefer a review pass.
