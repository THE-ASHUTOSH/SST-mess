ALTER TABLE "vendor_selections" ALTER COLUMN "hostel" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."hostel";--> statement-breakpoint
CREATE TYPE "public"."hostel" AS ENUM('Velankani Micro Campus (Uniworld 2)', 'Neeladri Micro Campus (Uniworld 1)');--> statement-breakpoint
ALTER TABLE "vendor_selections" ALTER COLUMN "hostel" SET DATA TYPE "public"."hostel" USING "hostel"::"public"."hostel";