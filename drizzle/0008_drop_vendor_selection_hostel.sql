ALTER TABLE "vendor_selections" DROP CONSTRAINT "vendor_selections_hostel_id_hostels_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_selections" DROP COLUMN "hostel";--> statement-breakpoint
ALTER TABLE "vendor_selections" DROP COLUMN "hostel_id";