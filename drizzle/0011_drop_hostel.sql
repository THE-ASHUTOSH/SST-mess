ALTER TABLE "hostels" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hostels" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_hostel_id_hostels_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hostel";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hostel_id";--> statement-breakpoint
DROP TYPE "public"."hostel";