ALTER TABLE "menus" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "menus" CASCADE;--> statement-breakpoint
-- IF EXISTS added by hand: the DROP TABLE ... CASCADE above already drops this FK, so
-- drizzle-kit's bare DROP CONSTRAINT errors with "constraint ... does not exist" (verified).
ALTER TABLE "vendors" DROP CONSTRAINT IF EXISTS "vendors_menu_id_menus_id_fk";
--> statement-breakpoint
DROP INDEX "vendors_menu_id_active_unique";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "menu_id";