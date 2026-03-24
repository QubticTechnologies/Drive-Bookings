import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const rideStatusEnum = pgEnum("ride_status", ["pending", "accepted", "in_progress", "completed", "cancelled", "scheduled"]);

export const ridesTable = pgTable("rides", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  pickupLat: real("pickup_lat").notNull(),
  pickupLng: real("pickup_lng").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  dropoffLat: real("dropoff_lat").notNull(),
  dropoffLng: real("dropoff_lng").notNull(),
  distanceKm: real("distance_km").notNull().default(0),
  driverId: integer("driver_id").references(() => driversTable.id),
  status: rideStatusEnum("status").notNull().default("pending"),
  estimatedFare: real("estimated_fare").notNull().default(0),
  finalFare: real("final_fare"),
  notes: text("notes"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({
  id: true,
  distanceKm: true,
  status: true,
  estimatedFare: true,
  finalFare: true,
  createdAt: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  driverId: true,
});
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;
