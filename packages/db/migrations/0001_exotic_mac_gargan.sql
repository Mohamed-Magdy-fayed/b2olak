CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."item_source" AS ENUM('seed', 'customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('approved', 'pending_review', 'merged');--> statement-breakpoint
CREATE TYPE "public"."item_unit" AS ENUM('piece', 'kg', 'gram', 'liter', 'pack');--> statement-breakpoint
CREATE TYPE "public"."alias_locale" AS ENUM('en', 'ar', 'unknown');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" varchar(128) NOT NULL,
	"name_ar" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"image_url" varchar(512),
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
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name_en" varchar(128),
	"name_ar" varchar(128),
	"normalized_en" varchar(128),
	"normalized_ar" varchar(128),
	"image_url" varchar(512),
	"default_unit" "item_unit" DEFAULT 'piece' NOT NULL,
	"status" "item_status" DEFAULT 'pending_review' NOT NULL,
	"merged_into_item_id" uuid,
	"source" "item_source" DEFAULT 'customer' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "item_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"alias" varchar(128) NOT NULL,
	"normalized_alias" varchar(128) NOT NULL,
	"locale" "alias_locale" DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" jsonb NOT NULL,
	"description" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_merged_into_item_id_items_id_fk" FOREIGN KEY ("merged_into_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_aliases" ADD CONSTRAINT "item_aliases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "items_category_status_idx" ON "items" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "items_normalized_en_trgm" ON "items" USING gin ("normalized_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "items_normalized_ar_trgm" ON "items" USING gin ("normalized_ar" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "item_aliases_normalized_unique" ON "item_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "item_aliases_normalized_trgm" ON "item_aliases" USING gin ("normalized_alias" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_key_unique" ON "system_settings" USING btree ("key");