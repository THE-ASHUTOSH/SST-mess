ALTER TABLE "vendors" ADD COLUMN "email" text;--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_email_active_unique" ON "vendors" USING btree ("email") WHERE "vendors"."deleted_at" IS NULL;