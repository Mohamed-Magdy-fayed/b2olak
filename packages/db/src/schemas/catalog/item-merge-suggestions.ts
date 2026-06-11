import { relations } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { ItemsTable } from "./items";

export const aiVerdictValues = ["match", "no_match", "unsure"] as const;
export const aiVerdictEnum = pgEnum("ai_verdict", aiVerdictValues);

export const suggestionStatusValues = ["pending", "accepted", "rejected"] as const;
export const suggestionStatusEnum = pgEnum(
  "suggestion_status",
  suggestionStatusValues,
);

/** Dedup candidates for a customer-added item (docs/05 stage 2–3). */
export const ItemMergeSuggestionsTable = pgTable(
  "item_merge_suggestions",
  {
    id,
    newItemId: uuid()
      .notNull()
      .references(() => ItemsTable.id, { onDelete: "cascade" }),
    candidateItemId: uuid()
      .notNull()
      .references(() => ItemsTable.id, { onDelete: "cascade" }),
    similarityScore: numeric({ precision: 4, scale: 3 }).notNull(),
    aiVerdict: aiVerdictEnum(),
    aiCanonicalEn: varchar({ length: 128 }),
    aiCanonicalAr: varchar({ length: 128 }),
    status: suggestionStatusEnum().notNull().default("pending"),
    resolvedByUserId: uuid().references(() => UsersTable.id),
    ...auditColumns,
  },
  (table) => [index("item_merge_suggestions_new_item_idx").on(table.newItemId)],
);

export const itemMergeSuggestionsRelations = relations(
  ItemMergeSuggestionsTable,
  ({ one }) => ({
    newItem: one(ItemsTable, {
      fields: [ItemMergeSuggestionsTable.newItemId],
      references: [ItemsTable.id],
      relationName: "suggestionNewItem",
    }),
    candidate: one(ItemsTable, {
      fields: [ItemMergeSuggestionsTable.candidateItemId],
      references: [ItemsTable.id],
      relationName: "suggestionCandidate",
    }),
  }),
);
