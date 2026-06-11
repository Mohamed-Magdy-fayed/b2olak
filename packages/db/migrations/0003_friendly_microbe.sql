CREATE TYPE "public"."ai_verdict" AS ENUM('match', 'no_match', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "item_merge_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"new_item_id" uuid NOT NULL,
	"candidate_item_id" uuid NOT NULL,
	"similarity_score" numeric(4, 3) NOT NULL,
	"ai_verdict" "ai_verdict",
	"ai_canonical_en" varchar(128),
	"ai_canonical_ar" varchar(128),
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar,
	"updated_at" timestamp with time zone,
	"updated_by" varchar,
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar
);
--> statement-breakpoint
ALTER TABLE "item_merge_suggestions" ADD CONSTRAINT "item_merge_suggestions_new_item_id_items_id_fk" FOREIGN KEY ("new_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_merge_suggestions" ADD CONSTRAINT "item_merge_suggestions_candidate_item_id_items_id_fk" FOREIGN KEY ("candidate_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_merge_suggestions" ADD CONSTRAINT "item_merge_suggestions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_merge_suggestions_new_item_idx" ON "item_merge_suggestions" USING btree ("new_item_id");