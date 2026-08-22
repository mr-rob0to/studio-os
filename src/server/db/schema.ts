import "server-only";

import { relations } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const briefs = pgTable("briefs", {
  id: uuid("id").primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull(),
  // Product values are enforced at the Zod boundary, so future values need no migration.
  contentType: text("content_type").notNull(),
  targetAudience: varchar("target_audience", { length: 500 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey(),
    briefId: uuid("brief_id")
      .notNull()
      .references(() => briefs.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull(),
    result: jsonb("result"),
    failureCode: varchar("failure_code", { length: 32 }),
    failureMessage: varchar("failure_message", { length: 240 }),
    provider: varchar("provider", { length: 24 }).notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 24 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("analyses_brief_id_unique").on(table.briefId)],
);

export const briefRelations = relations(briefs, ({ one }) => ({
  analysis: one(analyses),
}));

export const analysisRelations = relations(analyses, ({ one }) => ({
  brief: one(briefs, {
    fields: [analyses.briefId],
    references: [briefs.id],
  }),
}));
