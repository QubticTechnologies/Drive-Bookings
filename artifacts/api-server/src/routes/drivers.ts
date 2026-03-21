import { Router, type IRouter } from "express";
import { db, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { insertDriverSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/drivers", async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select().from(driversTable);
    if (status && typeof status === "string") {
      const drivers = await db.select().from(driversTable).where(eq(driversTable.status, status as "available" | "busy" | "offline"));
      return res.json(drivers.map(formatDriver));
    }
    const drivers = await query;
    return res.json(drivers.map(formatDriver));
  } catch (err) {
    req.log.error({ err }, "Failed to list drivers");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drivers", async (req, res) => {
  try {
    const parsed = insertDriverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const [driver] = await db.insert(driversTable).values(parsed.data).returning();
    return res.status(201).json(formatDriver(driver));
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "A driver with this email, license, or plate already exists." });
    }
    req.log.error({ err }, "Failed to register driver");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drivers/:driverId", async (req, res) => {
  try {
    const driverId = parseInt(req.params.driverId);
    if (isNaN(driverId)) return res.status(400).json({ error: "Invalid driver ID" });
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    return res.json(formatDriver(driver));
  } catch (err) {
    req.log.error({ err }, "Failed to get driver");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/drivers/:driverId", async (req, res) => {
  try {
    const driverId = parseInt(req.params.driverId);
    if (isNaN(driverId)) return res.status(400).json({ error: "Invalid driver ID" });
    const { status } = req.body;
    if (!status || !["available", "busy", "offline"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [driver] = await db.update(driversTable).set({ status }).where(eq(driversTable.id, driverId)).returning();
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    return res.json(formatDriver(driver));
  } catch (err) {
    req.log.error({ err }, "Failed to update driver status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function formatDriver(driver: typeof driversTable.$inferSelect) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    licenseNumber: driver.licenseNumber,
    vehicleMake: driver.vehicleMake,
    vehicleModel: driver.vehicleModel,
    vehicleYear: driver.vehicleYear,
    vehiclePlate: driver.vehiclePlate,
    vehicleColor: driver.vehicleColor,
    status: driver.status,
    rating: driver.rating,
    totalRides: driver.totalRides,
    createdAt: driver.createdAt,
  };
}

export default router;
