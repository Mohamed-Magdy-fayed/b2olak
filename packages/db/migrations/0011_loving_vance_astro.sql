DROP INDEX "items_category_status_idx";--> statement-breakpoint
DROP INDEX "addresses_user_idx";--> statement-breakpoint
DROP INDEX "orders_status_created_idx";--> statement-breakpoint
DROP INDEX "orders_driver_status_idx";--> statement-breakpoint
DROP INDEX "orders_customer_created_idx";--> statement-breakpoint
CREATE INDEX "driver_profiles_status_available_idx" ON "driver_profiles" USING btree ("status","is_available") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "orders_driver_created_idx" ON "orders" USING btree ("driver_id","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "items_category_status_idx" ON "items" USING btree ("category_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "orders_driver_status_idx" ON "orders" USING btree ("driver_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "orders_customer_created_idx" ON "orders" USING btree ("customer_id","created_at") WHERE deleted_at IS NULL;