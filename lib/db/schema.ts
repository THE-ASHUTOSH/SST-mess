import { pgTable, text, boolean, integer, timestamp, date, jsonb, pgEnum, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "student", "vendor", "superAdmin"]);
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
    email: text("email"), // login email that maps a vendor user to this vendor (superAdmin-managed)
    description: text("description"),
    price: integer("price").notNull(), // Storing as integer (e.g., cents/pysa) or just number
    menuUrl: text("menu_url"),
    menuId: uuid("menu_id").references(() => menus.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    breakfast: boolean("breakfast").default(true),
    lunch: boolean("lunch").default(true),
    dinner: boolean("dinner").default(true),
    deletedAt: timestamp("deleted_at"),
}, (table) => ({
    // Soft-delete: a menu can only bind to ONE *active* vendor; the menu becomes reusable once the vendor is soft-deleted.
    menuIdActiveUnique: uniqueIndex("vendors_menu_id_active_unique").on(table.menuId).where(sql`${table.deletedAt} IS NULL`),
    // At most one ACTIVE vendor per login email (emails are stored lowercased). NULL emails are allowed & non-conflicting.
    emailActiveUnique: uniqueIndex("vendors_email_active_unique").on(table.email).where(sql`${table.deletedAt} IS NULL`),
    deletedAtIdx: index("vendors_deleted_at_idx").on(table.deletedAt),
}));

/**
 * One vendor's menu for one calendar day.
 *
 * Replaces the recurring weekly `menus` table: the admin edits an explicit rolling window of days
 * (see MENU_WINDOW_DAYS) instead of a pattern that repeats forever, so "Tuesday" can differ week to
 * week. `date` is a plain Postgres date in IST — no timestamp, so no timezone drift between the
 * admin who typed it and the student reading it.
 *
 * Days older than MENU_RETENTION_DAYS are hard-deleted; the UI only ever shows today onwards.
 */
export const menuDays = pgTable("menu_days", {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "cascade" }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    // Dish lists. Empty array = "nothing set yet", which the UI shows as an invitation to add.
    breakfast: jsonb("breakfast").$type<string[]>().notNull().default([]),
    lunch: jsonb("lunch").$type<string[]>().notNull().default([]),
    dinner: jsonb("dinner").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    // One menu per vendor per day — lets the editor upsert without a read-then-write race.
    vendorDateUnique: uniqueIndex("menu_days_vendor_date_uniq").on(table.vendorId, table.date),
    // Every read filters on the date window, and the cleanup deletes by date.
    dateIdx: index("menu_days_date_idx").on(table.date),
}));

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
}, (table) => ({
    // One selection per user per month — lets the bulk upload upsert atomically (ON CONFLICT).
    userMonthUnique: uniqueIndex("vendor_selections_user_month_uniq").on(table.userId, table.forMonth),
}));

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
    menuDays: many(menuDays),
    feedbacks: many(vendorFeedbacks),
    selections: many(vendorSelections),
}));

export const menuDaysRelations = relations(menuDays, ({ one }) => ({
    vendor: one(vendors, {
        fields: [menuDays.vendorId],
        references: [vendors.id],
    }),
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
