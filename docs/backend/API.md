# SST Mess Backend API Documentation

This documentation provides a detailed overview of the backend APIs for the SST Mess application.

## API Endpoints

The API endpoints are organized into the following categories:

- [Admin](#admin)
- [Controls](#controls)
- [Meal](#meal)
- [User](#user)
- [Vendor](#vendor)

---

## Admin

Vendor selections are uploaded **per vendor**: the admin picks a vendor + month and supplies a list of
student **emails** (pasted or in a CSV/XLSX). It's a two-step flow — **verify** (dry-run) then **commit**.
Both are **superAdmin only**.

**Limits & capacity.** Each upload is capped at **10,000 emails/students** and a **5 MB** file — anything
larger returns `400` (split into batches). Both steps are bulk, so DB round-trips stay low regardless of
list size: **verify** ≈ 4 queries (flat); **commit** ≈ `3 + ⌈inserts / 500⌉` (e.g. 1k → ~5, 5k → ~13).
Comfortable throughput is **~2,000–5,000 students per upload** (finishes in well under ~2.5 s); workable up
to ~20k on Pro-tier timeouts. The 10k cap deliberately keeps requests clear of Postgres' ~65,535
bind-parameter-per-statement ceiling. Raise `MAX_UPLOAD_EMAILS` in `lib/vendor-selection-upload.ts` only
together with chunking the read/update queries.

### `POST /api/admin/upload-vendor-selection/verify`

Dry-run. Parses emails from the pasted text and/or uploaded file, then classifies them against the DB
**without writing anything**, so the admin can review before committing.

**Request Body (form-data):**

- `vendorId` (uuid, required): The vendor these students opted into.
- `month` (string, required): `YYYY-MM`.
- `preference` (string, **required**): one of `Vegetarian` · `Non-Vegetarian` · `Eggetarian`. Applies
  to **every** student in the batch — the sheet carries no per-student dietary column, so split the
  month's list by preference and upload one batch each. Required, never defaulted: the column
  defaults to `Vegetarian`, so omitting it would silently record the whole batch as vegetarian and
  skew that month's demand analytics.
- `emails` (string, optional): Pasted emails separated by spaces/commas/newlines.
- `file` (file, optional): CSV/XLSX; any cell containing an email is picked up (other columns ignored).

**Response:**

```json
{
  "success": true,
  "vendor": { "id": "vendor-id", "name": "Sodexo" },
  "month": "2026-07",
  "preference": "Non-Vegetarian",
  "toCreate": [{ "email": "a@sst.scaler.com", "userId": "…", "name": "A" }],
  "duplicates": [{ "email": "b@sst.scaler.com", "userId": "…", "name": "B", "currentVendorId": "…", "currentVendorName": "Other", "alreadyThisVendor": false }],
  "notFound": ["ghost@sst.scaler.com"],
  "invalid": ["not-an-email"],
  "counts": { "detected": 4, "toCreate": 1, "duplicates": 1, "notFound": 1, "invalid": 1 }
}
```

### `POST /api/admin/upload-vendor-selection/commit`

Writes the reviewed decisions in bulk (a few queries total — no per-row round-trips). `createUserIds` get a
new selection for the vendor; `overwriteUserIds` (duplicates the admin chose to move) have their existing
month selection reassigned to this vendor. Not-found/invalid emails are simply omitted by the client. Busts
the `meal-history` cache.

**Request Body (JSON):**

- `vendorId` (uuid, required), `month` (`YYYY-MM`, required)
- `preference` (string, **required**): as for `verify`. Written on both paths — an overwritten
  selection gets the new preference too, so a reassigned row can't keep a stale dietary value.
- `createUserIds` (uuid[]): students with no selection this month.
- `overwriteUserIds` (uuid[]): duplicates to reassign to this vendor.

**Response:**

```json
{ "success": true, "message": "Vendor selections saved.", "created": 40, "overwritten": 3 }
```

### `GET /api/admin/users`

Search/list users for role administration. **superAdmin only.** With `?search=<q>` it matches email or name (case-insensitive); without a query it returns the current privileged users (admins, vendors, superAdmins). Capped at 100 rows.

**Response:**

```json
{
  "success": true,
  "users": [
    { "id": "user-id", "name": "Jane", "email": "jane@sst.scaler.com", "role": "admin", "roll": null, "batch": null }
  ]
}
```

### `POST /api/admin/users`

Create an account. **superAdmin only.** Body: `{ "email", "name", "role" }`.

Since `getDbUser()` never auto-creates, this is the only way an admin/superAdmin/vendor account comes into existence.

- `role` must be one of `admin`, `superAdmin`, `vendor` — **`student` is rejected** (`400`); students come from the roster.
- `email` must be well-formed and on an allowed domain (`@sst.scaler.com` / `@scaler.com`) → otherwise `400`. Stored lowercased.
- `name` is required, max 120 chars → otherwise `400`.
- A duplicate email (matched case-insensitively) returns `409`.

**Response** (`201`): `{ "success": true, "message": "User created successfully", "user": { … } }`

### `PATCH /api/admin/users?id=[id]`

Change a user's role. **superAdmin only.** Body: `{ "role": "admin" | "superAdmin" | "vendor" }`.

`student` is **not assignable** — on create or on change (`400`). The roster owns students, so nobody can be promoted out of, or demoted into, that role here. A superAdmin **cannot change their own role** (guards against self-lockout → `400`). Returns `400` for an invalid id/role and `404` if the user does not exist.

A user holds exactly one role, so moving a **vendor operator** off `vendor` while it is still linked to an active vendor returns `409` — unlink it under Manage Vendors first.

### `DELETE /api/admin/users?id=[id]`

Remove an account. **superAdmin only.** Refuses rather than cascading, so audit history is never destroyed:

| Condition | Status |
| --- | --- |
| Removing yourself | `400` |
| Target is a `student` (roster-owned) | `400` |
| Linked to an active vendor | `409` (names the vendor) |
| Has meals, feedback or vendor selections | `409` (names which) |
| User not found | `404` |

**Response:** `{ "success": true, "message": "Jane removed." }`

### `GET /api/admin/vendor-users[?vendorId=[id]]`

Vendor login accounts available to link to a vendor entity. **superAdmin only.** Returns accounts with role `vendor` that are not already claimed by another **active** vendor (soft-deleting a vendor releases its account). Pass `vendorId` when editing so that vendor's current account stays selectable. Capped at 200 rows.

**Response:**

```json
{ "success": true, "users": [{ "id": "user-id", "name": "Vendor A", "email": "vendor-a@scaler.com" }] }
```

**Response:**

```json
{
  "success": true,
  "message": "Role updated successfully",
  "user": { "id": "user-id", "name": "Jane", "email": "jane@sst.scaler.com", "role": "vendor" }
}
```

---

## Controls

### `GET /api/controls/feedback-toggle`

Fetches the current state of the feedback toggle.

**Response:**

```json
{
  "success": true,
  "enabled": true
}
```

### `PATCH /api/controls/feedback-toggle`

Toggles the state of the feedback toggle. This endpoint is for admins only.

**Response:**

```json
{
  "success": true,
  "enabled": false
}
```

---

## Meal

### `GET /api/meal/generate-qr`

Generates a JWT token for a user, which can be used as a QR code for meal verification.

**Checks:**

- Ensures the user is authenticated.
- Checks if it's the correct time for a meal (breakfast, lunch, or dinner).
- Verifies that the user has opted for mess for the current month.
- Checks if the selected vendor offers the current meal.
- Prevents generating a new QR code if one has already been used for the same meal on the same day.

**Response:**

```json
{
  "success": true,
  "token": "your-jwt-token"
}
```

### `GET /api/meal/status`

Checks if the user has already scanned their QR code for the current meal on the same day.

**Response:**

```json
{
  "success": true,
  "status": "scanned"
}
```

or

```json
{
  "success": true,
  "status": "not_scanned"
}
```

### `POST /api/meal/verify-qr`

Used by vendors or admins to verify a student's meal QR code.

**Request Body:**

- `token` (string, required): The JWT token from the QR code.
- `vendorId` (string, required): The ID of the vendor.

**Response:**

```json
{
  "success": true,
  "message": "Meal verified successfully.",
  "user": {
    "id": "user-id",
    "name": "Student Name",
    "email": "student@example.com"
  }
}
```

---

## User

### `GET /api/user/latest-vendor`

Fetches the user's latest vendor selection for the current month.

**Response:**

```json
{
  "success": true,
  "latestSelection": {
    "id": "selection-id",
    "userId": "user-id",
    "vendorId": "vendor-id",
    "vendor": {
      "id": "vendor-id",
      "name": "Vendor Name"
    }
  }
}
```

### `GET /api/user/me`

Fetches the currently authenticated user's details.

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

---

## Vendor

> **Vendor accounts & scoping.** Each vendor row can carry a login **`email`** (superAdmin-managed). A `vendor`-role
> user is mapped to their vendor by that email (case-insensitive, active vendors only), which **scopes their scanner
> and stats to their own vendor**: `verify-qr` and `total-meals` re-resolve the vendor server-side from the session
> and ignore any client-supplied `vendorId`, so one vendor can never act on another's students or stats. The `email`
> is superAdmin-only — it is **omitted** from the public `getVendors` and only returned by `GET /api/admin/vendors`
> and `GET /api/vendor/my-vendor` (which returns just the caller's own `{id, name}`).

### `POST /api/vendor/manageVendor`

To add a new vendor. It takes vendor details: name, login email, description, price, and meal options. **superAdmin only.**

> **Note:** This endpoint manages the vendor **record** — `POST` creates, `PUT ?id=` updates details, and `DELETE ?id=` soft-deletes. All three are **superAdmin only**. The vendor's **menu** (URL + weekly CSV) is managed separately via `PUT /api/vendor/updateMenu` (see below), which admins can also access.

**Request Body (form-data):**

- `name` (string, required): Vendor's name.
- `email` (string, optional): The vendor's login email (stored lowercased). Must belong to an **existing account with role `vendor`** that no other active vendor has claimed — see `GET /api/admin/vendor-users` for the selectable set. A missing account, a non-vendor role, or an already-claimed account each return `400`. This endpoint never creates or promotes a `users` row. On `PUT`, an **unchanged** email skips this check so a legacy vendor stays editable.
- `description` (string): Vendor's description.
- `price` (number, required): Price.
- `mealsOptions` (JSON string): e.g., `{"breakfast": true, "lunch": true, "dinner": false}`

**Response:**

```json
{
  "success": true,
  "message": "Vendor added successfully",
  "vendor": {
    "id": "new-vendor-id",
    "name": "New Vendor"
  }
}
```

### `PUT /api/vendor/manageVendor?id=[id]`

To update an existing (non-deleted) vendor's details (name, description, price, meal options). Same form-data body as the `POST` above. **superAdmin only.** Returns `404` if the vendor does not exist or has been soft-deleted.

**Response:**

```json
{
  "success": true,
  "message": "Vendor updated successfully",
  "vendor": {
    "id": "vendor-id",
    "name": "Updated Vendor Name"
  }
}
```

### `DELETE /api/vendor/manageVendor?id=[id]`

To soft-delete a vendor. **superAdmin only.** Sets `deletedAt` so the vendor is hidden from `getVendors` and all listings, while its meal/feedback/selection history and menu row are preserved (no FK cascade). Returns `404` if the vendor does not exist or is already deleted.

**Response:**

```json
{
  "success": true,
  "message": "Vendor deleted successfully",
  "vendor": {
    "id": "vendor-id",
    "name": "Deleted Vendor Name"
  }
}
```

### `PUT /api/vendor/updateMenu?id=[id]`

To update a vendor's **menu** — the menu URL and/or the weekly menu parsed from an uploaded CSV. Accessible to **admin and superAdmin**. Does not touch the vendor's name/price/meal options (those live in `manageVendor`). Returns `404` if the vendor does not exist or has been soft-deleted.

**Request Body (form-data):**

- `menuUrl` (string): URL to the menu (empty clears it).
- `menuFile` (file, optional): CSV file for the weekly menu. If provided, it replaces the vendor's existing weekly menu; if omitted, only the URL is updated.

**Response:**

```json
{
  "success": true,
  "message": "Menu updated successfully",
  "vendor": {
    "id": "vendor-id",
    "name": "Vendor Name"
  }
}
```

### `POST /api/vendor/choice-analysis`

For vendors and admins to get vendor selection data for a specific month and year.

**Request Body:**

- `month` (number): The month (1-12).
- `year` (number): The year.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "selection-id",
      "userId": "user-id",
      "vendorId": "vendor-id",
      "vendor": {
        "id": "vendor-id",
        "name": "Vendor Name"
      }
    }
  ]
}
```

### `GET /api/vendor/feedback-analysis`

For admins to get paginated vendor feedback.

**Query Parameters:**

- `page` (number): Page number for pagination.
- `limit` (number): Number of items per page.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "feedback-id",
      "vendorId": "vendor-id",
      "feedback": "Great food!",
      "vendor": {
        "id": "vendor-id",
        "name": "Vendor Name"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "hasMore": true
  }
}
```

### `GET /api/vendor/getVendors`

Fetches all active (non-soft-deleted) vendors and their associated menus.

**Response:**

```json
{
  "success": true,
  "vendors": [
    {
      "id": "vendor-id",
      "name": "Vendor Name",
      "menu": {
        "id": "menu-id",
        "day1": "Dal, Roti"
      }
    }
  ]
}
```

### `POST /api/vendor/vendorFeedbackForm`

For authenticated users to submit feedback for a vendor.

**Request Body:**

- `ratings` (object, required):
  - `hygiene` (number, 1-5)
  - `quantity` (number, 1-5)
  - `timeliness` (number, 1-5)
  - `variety` (number, 1-5)
  - `staff` (number, 1-5)
  - `overall` (number, 1-5)
- `vendor` (string, required): The ID of the vendor.
- `feedback` (string, optional): Feedback message.

**Response:**

```json
{
  "success": true,
  "VendorFeedbackForm": {
    "id": "new-feedback-id"
  }
}
```

---
## Database Schema

```typescript
import { pgTable, text, boolean, integer, timestamp, date, jsonb, pgEnum, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "student", "vendor"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner"]);
export const preferenceEnum = pgEnum("preference", ["Vegetarian", "Non-Vegetarian", "Eggetarian"]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    roll: text("roll"), // Roll number
    role: roleEnum("role").default("student"),
    picture: text("picture"),
    batch: text("batch"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// menus must be defined before vendors
export const menus = pgTable("menus", {
    id: uuid("id").defaultRandom().primaryKey(),
    monday: jsonb("monday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    tuesday: jsonb("tuesday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    wednesday: jsonb("wednesday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    thursday: jsonb("thursday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    friday: jsonb("friday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    saturday: jsonb("saturday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    sunday: jsonb("sunday").$type<{ breakfast: string[]; lunch: string[]; dinner: string[] }>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(), // Storing as integer (e.g., cents/pysa) or just number
    menuUrl: text("menu_url"),
    menuId: uuid("menu_id").references(() => menus.id).unique(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    breakfast: boolean("breakfast").default(true),
    lunch: boolean("lunch").default(true),
    dinner: boolean("dinner").default(true),
});

export const meals = pgTable("meals", {
    id: uuid("id").defaultRandom().primaryKey(),
    forUserId: uuid("for_user_id").references(() => users.id).notNull(),
    byUserId: uuid("by_user_id").references(() => users.id).notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    date: timestamp("date").notNull().defaultNow(),
}, (table) => ({
    // Unique constraint to prevent duplicate meals per user per day per meal type
    userMealDateIdx: uniqueIndex("meals_user_meal_date_idx").on(table.forUserId, table.mealType, table.date),
}));

export const controls = pgTable("controls", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    enabled: boolean("enabled").default(false),
});

export const vendorFeedbacks = pgTable("vendor_feedbacks", {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    feedback: text("feedback"),
    hygiene: integer("hygiene").notNull(),
    quantity: integer("quantity").notNull(),
    timeliness: integer("timeliness").notNull(),
    variety: integer("variety").notNull(),
    staff: integer("staff").notNull(),
    overall: integer("overall").notNull(),
    date: timestamp("date").defaultNow(),
});

export const vendorSelections = pgTable("vendor_selections", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
    preference: preferenceEnum("preference").default("Vegetarian"),
    forMonth: timestamp("for_month").notNull(), // Using timestamp to store month start date
    dateofEntry: timestamp("date_of_entry").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    mealsEaten: many(meals, { relationName: "eaten_meals" }),
    mealsGenerated: many(meals, { relationName: "generated_meals" }),
    feedbacks: many(vendorFeedbacks),
    selections: many(vendorSelections),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
    menu: one(menus, {
        fields: [vendors.menuId],
        references: [menus.id],
    }),
    feedbacks: many(vendorFeedbacks),
    selections: many(vendorSelections),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
    forUser: one(users, {
        fields: [meals.forUserId],
        references: [users.id],
        relationName: "eaten_meals"
    }),
    byUser: one(users, {
        fields: [meals.byUserId],
        references: [users.id],
        relationName: "generated_meals"
    }),
}));

export const menusRelations = relations(menus, ({ one }) => ({
    vendor: one(vendors, {
        fields: [menus.id],
        references: [vendors.menuId],
    }),
}));

export const vendorFeedbacksRelations = relations(vendorFeedbacks, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorFeedbacks.vendorId],
        references: [vendors.id],
    }),
    user: one(users, {
        fields: [vendorFeedbacks.userId],
        references: [users.id],
    }),
}));

export const vendorSelectionsRelations = relations(vendorSelections, ({ one }) => ({
    user: one(users, {
        fields: [vendorSelections.userId],
        references: [users.id],
    }),
    vendor: one(vendors, {
        fields: [vendorSelections.vendorId],
        references: [vendors.id],
    }),
}));
```
