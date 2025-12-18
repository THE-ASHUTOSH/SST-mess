
import { pgTable, serial, text, boolean, integer, timestamp, date, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "student", "vendor"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner"]);
export const preferenceEnum = pgEnum("preference", ["Vegetarian", "Non-Vegetarian"]);
export const hostelEnum = pgEnum("hostel", ["Velankani Micro Campus", "Neeladri Micro Campus"]);

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    roll: text("roll"), // Roll number
    role: roleEnum("role").default("student"),
    picture: text("picture"),
    hostel: text("hostel"),
    batch: text("batch"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(), // Storing as integer (e.g., cents/pysa) or just number
    menuUrl: text("menu_url"),
    // menu relation will be handled via relations or manual query
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    breakfast: boolean("breakfast").default(true),
    lunch: boolean("lunch").default(true),
    dinner: boolean("dinner").default(true),
});

export const menus = pgTable("menus", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id).notNull().unique(),
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

export const meals = pgTable("meals", {
    id: serial("id").primaryKey(),
    forUserId: integer("for_user_id").references(() => users.id).notNull(),
    byUserId: integer("by_user_id").references(() => users.id).notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    date: timestamp("date").notNull().defaultNow(),
});

export const controls = pgTable("controls", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    enabled: boolean("enabled").default(false),
});

export const vendorFeedbacks = pgTable("vendor_feedbacks", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
    userId: integer("user_id").references(() => users.id).notNull(),
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
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
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
        fields: [vendors.id],
        references: [menus.vendorId],
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
        fields: [menus.vendorId],
        references: [vendors.id],
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
