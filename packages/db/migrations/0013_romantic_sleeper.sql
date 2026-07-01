CREATE TYPE "public"."driver_ledger_reason" AS ENUM('shortfall', 'settlement', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."customer_wallet_reason" AS ENUM('overpayment', 'redemption', 'refund', 'adjustment');--> statement-breakpoint
CREATE TABLE "driver_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"reason" "driver_ledger_reason" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "customer_wallet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"reason" "customer_wallet_reason" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wallet_balance" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD COLUMN "balance" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "wallet_applied" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_ledger_entries" ADD CONSTRAINT "driver_ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_ledger_entries" ADD CONSTRAINT "driver_ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_wallet_entries" ADD CONSTRAINT "customer_wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_wallet_entries" ADD CONSTRAINT "customer_wallet_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_ledger_entries_user_idx" ON "driver_ledger_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_wallet_entries_user_idx" ON "customer_wallet_entries" USING btree ("user_id","created_at");