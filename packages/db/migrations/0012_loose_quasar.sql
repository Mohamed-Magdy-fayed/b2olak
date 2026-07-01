CREATE TYPE "public"."notification_channel" AS ENUM('push', 'whatsapp');--> statement-breakpoint
-- Data migration: add nullable first so the NOT NULL constraint is only applied
-- after every existing row has been backfilled (a single ADD COLUMN ... NOT NULL
-- DEFAULT would otherwise have to trust the default for all pre-existing rows).
ALTER TABLE "users" ADD COLUMN "notification_channel" "notification_channel";--> statement-breakpoint
-- Existing users with a valid Expo push token → push (they already granted OS
-- notifications); everyone else → whatsapp (the safe fallback).
UPDATE "users" SET "notification_channel" =
  (CASE WHEN "push_token" LIKE 'ExponentPushToken[%' THEN 'push' ELSE 'whatsapp' END)::"public"."notification_channel";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "notification_channel" SET DEFAULT 'whatsapp';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "notification_channel" SET NOT NULL;
