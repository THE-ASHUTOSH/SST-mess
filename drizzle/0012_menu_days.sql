CREATE TABLE "menu_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"date" date NOT NULL,
	"breakfast" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lunch" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dinner" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "menu_days" ADD CONSTRAINT "menu_days_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_days_vendor_date_uniq" ON "menu_days" USING btree ("vendor_id","date");--> statement-breakpoint
CREATE INDEX "menu_days_date_idx" ON "menu_days" USING btree ("date");