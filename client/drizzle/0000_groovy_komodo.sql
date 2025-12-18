CREATE TYPE "public"."hostel" AS ENUM('Velankani Micro Campus', 'Neeladri Micro Campus');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."preference" AS ENUM('Vegetarian', 'Non-Vegetarian');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'student', 'vendor');--> statement-breakpoint
CREATE TABLE "controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false,
	CONSTRAINT "controls_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"for_user_id" integer NOT NULL,
	"by_user_id" integer NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"monday" jsonb,
	"tuesday" jsonb,
	"wednesday" jsonb,
	"thursday" jsonb,
	"friday" jsonb,
	"saturday" jsonb,
	"sunday" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "menus_vendor_id_unique" UNIQUE("vendor_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"roll" text,
	"role" "role" DEFAULT 'student',
	"picture" text,
	"hostel" text,
	"batch" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendor_feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"feedback" text,
	"hygiene" integer NOT NULL,
	"quantity" integer NOT NULL,
	"timeliness" integer NOT NULL,
	"variety" integer NOT NULL,
	"staff" integer NOT NULL,
	"overall" integer NOT NULL,
	"date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"preference" "preference" DEFAULT 'Vegetarian',
	"hostel" "hostel",
	"for_month" timestamp NOT NULL,
	"date_of_entry" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"menu_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"breakfast" boolean DEFAULT true,
	"lunch" boolean DEFAULT true,
	"dinner" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_for_user_id_users_id_fk" FOREIGN KEY ("for_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_feedbacks" ADD CONSTRAINT "vendor_feedbacks_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_feedbacks" ADD CONSTRAINT "vendor_feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_selections" ADD CONSTRAINT "vendor_selections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_selections" ADD CONSTRAINT "vendor_selections_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;