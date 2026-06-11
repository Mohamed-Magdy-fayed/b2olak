CREATE TYPE "public"."actor_role" AS ENUM('customer', 'driver', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."cancelled_by" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('pending', 'found', 'unavailable', 'substituted');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('placed', 'assigned', 'shopping', 'purchased', 'delivering', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(64),
	"city" varchar(128) NOT NULL,
	"area" varchar(128) NOT NULL,
	"street" varchar(256) NOT NULL,
	"building" varchar(64),
	"floor" varchar(32),
	"apartment" varchar(32),
	"landmark" varchar(256),
	"contact_phone" varchar(16) NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" uuid NOT NULL,
	"driver_id" uuid,
	"status" "order_status" DEFAULT 'placed' NOT NULL,
	"city" varchar(128) NOT NULL,
	"area" varchar(128) NOT NULL,
	"street" varchar(256) NOT NULL,
	"building" varchar(64),
	"floor" varchar(32),
	"apartment" varchar(32),
	"landmark" varchar(256),
	"contact_phone" varchar(16) NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"delivery_fee" numeric(10, 2) NOT NULL,
	"actual_items_total" numeric(10, 2),
	"cod_total" numeric(10, 2),
	"customer_note" text,
	"cancelled_by" "cancelled_by",
	"cancel_reason" text,
	"assigned_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"name_snapshot_en" varchar(128),
	"name_snapshot_ar" varchar(128),
	"qty" numeric(10, 3) NOT NULL,
	"unit" "item_unit" NOT NULL,
	"customer_note" text,
	"status" "order_item_status" DEFAULT 'pending' NOT NULL,
	"actual_unit_price" numeric(10, 2),
	"actual_line_total" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "actor_role" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_driver_status_idx" ON "orders" USING btree ("driver_id","status");--> statement-breakpoint
CREATE INDEX "orders_customer_created_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_events_order_idx" ON "order_status_events" USING btree ("order_id","created_at");