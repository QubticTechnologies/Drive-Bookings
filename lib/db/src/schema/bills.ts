import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ridesTable } from "./rides";
import { driversTable } from "./drivers";

export const billStatusEnum = pgEnum("bill_status", ["unpaid", "paid"]);

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => ridesTable.id),
  driverId: integer("driver_id").references(() => driversTable.id),
  clientName: text("client_name").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  distanceKm: real("distance_km").notNull(),
  baseFare: real("base_fare").notNull(),
  distanceFare: real("distance_fare").notNull(),
  totalFare: real("total_fare").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: billStatusEnum("status").notNull().default("unpaid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
