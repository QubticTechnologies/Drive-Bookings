import { pgTable, varchar, boolean, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: varchar("phone_number", { length: 20 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  userType: varchar("user_type", { length: 20 }),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: varchar("verification_code", { length: 6 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("5.0"),
  totalRides: integer("total_rides").notNull().default(0),
  profilePictureUrl: varchar("profile_picture_url", { length: 2000 }),
  preferredLanguage: varchar("preferred_language", { length: 10 }).notNull().default("en"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  isVerified: true,
  totalRides: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
