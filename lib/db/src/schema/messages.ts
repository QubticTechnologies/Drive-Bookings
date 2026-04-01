import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { ridesTable } from "./rides";

export const rideMessagesTable = pgTable("ride_messages", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => ridesTable.id),
  sender: text("sender").notNull().default("GoRide"),
  senderType: text("sender_type").notNull().default("system"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RideMessage = typeof rideMessagesTable.$inferSelect;
