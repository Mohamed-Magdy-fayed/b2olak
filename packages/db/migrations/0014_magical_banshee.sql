CREATE TYPE "public"."price_sync_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "item_price_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"unit" varchar(32) NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"avg_price" numeric(10, 2),
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "price_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "price_sync_status" DEFAULT 'running' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"stats_upserted" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "item_price_stats" ADD CONSTRAINT "item_price_stats_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_price_stats_item_unit_unique" ON "item_price_stats" USING btree ("item_id","unit");--> statement-breakpoint
CREATE INDEX "item_price_stats_item_idx" ON "item_price_stats" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "order_items_item_idx" ON "order_items" USING btree ("item_id");