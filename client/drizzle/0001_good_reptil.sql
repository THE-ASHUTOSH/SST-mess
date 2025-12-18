ALTER TABLE "menus" DROP CONSTRAINT "menus_vendor_id_unique";--> statement-breakpoint
ALTER TABLE "menus" DROP CONSTRAINT "menus_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "menu_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" DROP COLUMN "vendor_id";--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_menu_id_unique" UNIQUE("menu_id");