import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driverStatusEnum = pgEnum("driver_status", ["available", "busy", "offline"]);

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  licenseNumber: text("license_number").notNull().unique(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  vehiclePlate: text("vehicle_plate").notNull().unique(),
  vehicleColor: text("vehicle_color").notNull(),
  status: driverStatusEnum("status").notNull().default("available"),
  rating: real("rating").notNull().default(5.0),
  totalRides: integer("total_rides").notNull().default(0),
  lastLat: real("last_lat"),
  lastLng: real("last_lng"),
  lastLocationUpdatedAt: timestamp("last_location_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, rating: true, totalRides: true, createdAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
