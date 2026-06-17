ALTER TABLE "vendors" DROP CONSTRAINT "vendors_menu_id_unique";--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_menu_id_active_unique" ON "vendors" USING btree ("menu_id") WHERE "vendors"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "vendors_deleted_at_idx" ON "vendors" USING btree ("deleted_at");