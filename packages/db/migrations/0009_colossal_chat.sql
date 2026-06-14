-- UOM module: replace the fixed `item_unit` enum with a managed `units` table
-- and a many-to-many `item_units` link. Data migration: seed the 5 existing
-- units, backfill each item's default link, snapshot order_items.unit, then
-- retire the old column + enum.

CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name_en" varchar(64) NOT NULL,
	"name_ar" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "item_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "units_code_unique" ON "units" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "item_units_item_unit_unique" ON "item_units" USING btree ("item_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_units_one_default" ON "item_units" USING btree ("item_id") WHERE "item_units"."is_default";--> statement-breakpoint

-- Data: seed the 5 units that previously lived in the `item_unit` enum.
INSERT INTO "units" ("code", "name_en", "name_ar", "sort_order") VALUES
	('piece', 'Piece', 'قطعة', 0),
	('kg', 'Kilogram', 'كيلوجرام', 1),
	('gram', 'Gram', 'جرام', 2),
	('liter', 'Liter', 'لتر', 3),
	('pack', 'Pack', 'عبوة', 4)
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint

-- Data: backfill each item's default unit link from the old `default_unit` column.
INSERT INTO "item_units" ("item_id", "unit_id", "is_default", "sort_order")
SELECT i."id", u."id", true, 0
FROM "items" i
JOIN "units" u ON u."code" = i."default_unit"::text;--> statement-breakpoint

-- Snapshot existing order lines: enum values are already the unit codes.
ALTER TABLE "order_items" ALTER COLUMN "unit" SET DATA TYPE varchar(32) USING "unit"::text;--> statement-breakpoint

-- Retire the old column + enum now that nothing references them.
ALTER TABLE "items" DROP COLUMN "default_unit";--> statement-breakpoint
DROP TYPE "public"."item_unit";
