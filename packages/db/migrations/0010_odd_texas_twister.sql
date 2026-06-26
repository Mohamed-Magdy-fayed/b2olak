CREATE TYPE "public"."unit_kind" AS ENUM('count', 'weight', 'money');--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "kind" "unit_kind" DEFAULT 'count' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_kind" "unit_kind" DEFAULT 'count' NOT NULL;--> statement-breakpoint
-- Data migration: classify existing units by kind and add the money (EGP-worth) unit.
UPDATE "units" SET "kind" = 'weight' WHERE "code" IN ('kg', 'gram', 'liter');--> statement-breakpoint
UPDATE "units" SET "kind" = 'count' WHERE "code" IN ('piece', 'pack');--> statement-breakpoint
INSERT INTO "units" ("code", "name_en", "name_ar", "kind", "sort_order", "is_active", "created_by")
VALUES ('egp', 'EGP worth', 'بقيمة (جنيه)', 'money', 5, true, 'migration')
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
-- Backfill the snapshot kind onto existing order lines from their unit code.
UPDATE "order_items" oi SET "unit_kind" = u."kind" FROM "units" u WHERE u."code" = oi."unit";