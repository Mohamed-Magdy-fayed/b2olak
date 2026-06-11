CREATE TYPE "public"."locale" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'customer', 'driver');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_token_type" AS ENUM('whatsapp_otp', 'password_reset', 'email_verify');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('motorcycle', 'bicycle', 'car', 'on_foot');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(16),
	"email" varchar(256),
	"name" varchar(256),
	"image_url" varchar(512),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"preferred_locale" "locale" DEFAULT 'ar' NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" varchar(512) NOT NULL,
	"salt" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "user_token_type" NOT NULL,
	"hashed_token" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "driver_status" DEFAULT 'pending' NOT NULL,
	"vehicle_type" "vehicle_type" DEFAULT 'motorcycle' NOT NULL,
	"vehicle_plate" varchar(32),
	"is_available" boolean DEFAULT false NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_user_unique" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tokens_user_type_idx" ON "user_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "user_tokens_expires_idx" ON "user_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_profiles_user_unique" ON "driver_profiles" USING btree ("user_id");