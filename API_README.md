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

### `POST /api/admin/upload-vendor-selection`

This endpoint is for admins to upload a spreadsheet (.xlsx) of vendor selections for a specific month. It processes the spreadsheet, creates new users if they don't exist, updates existing user information, and creates new vendor selections. It also handles duplicates and errors in the uploaded data.

**Request Body:**

- `month` (string, required): The month for the vendor selections (e.g., "2024-08").
- `vendor-selection` (file, required): The spreadsheet file containing the vendor selections.

**Response:**

```json
{
  "message": "Vendor selection upload processed.",
  "newEntries": 100,
  "duplicates": 5,
  "issues": [
    {
      "row": {
        "Email Address": "test@example.com"
      },
      "error": "Vendor with name 'Non-Existent Vendor' not found"
    }
  ]
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

### `POST /api/vendor/addVendor`

For admins to add a new vendor. It takes vendor details like name, description, price, and meal options. It can also accept a menu file (CSV) which it parses and associates with the new vendor.

**Request Body (form-data):**

- `name` (string, required): Vendor's name.
- `description` (string): Vendor's description.
- `price` (number, required): Price.
- `menuUrl` (string): URL to the menu.
- `mealsOptions` (JSON string): e.g., `{"breakfast": true, "lunch": true, "dinner": false}`
- `menuFile` (file): CSV file for the menu.

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

Fetches all vendors and their associated menus.

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

### `PUT /api/vendor/updateVendor/[id]`

For admins to update an existing vendor's details.

**Request Body (form-data):**

- `name` (string): Vendor's name.
- `description` (string): Vendor's description.
- `price` (number): Price.
- `menuUrl` (string): URL to the menu.
- `mealsOptions` (JSON string): e.g., `{"breakfast": true, "lunch": true, "dinner": false}`
- `menuFile` (file): CSV file for the menu.

**Response:**

```json
{
  "message": "Vendor updated successfully",
  "vendor": {
    "id": "vendor-id",
    "name": "Updated Vendor Name"
  }
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
export const hostelEnum = pgEnum("hostel", ["Velankani Micro Campus (Uniworld 2)", "Neeladri Micro Campus (Uniworld 1)"]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    roll: text("roll"), // Roll number
    role: roleEnum("role").default("student"),
    picture: text("picture"),
    hostel: text("hostel"),
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
    hostel: hostelEnum("hostel"),
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
