import { Router, type IRouter } from "express";
import { db, ridesTable, driversTable, billsTable, rideMessagesTable } from "@workspace/db";
import { eq, and, isNull, asc } from "drizzle-orm";

const router: IRouter = Router();

const BASE_FARE = 3.0;
const RATE_PER_KM = 1.5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, R * c);
}

function calcFare(distanceKm: number): number {
  return Math.round((BASE_FARE + RATE_PER_KM * distanceKm) * 100) / 100;
}

function formatRide(ride: typeof ridesTable.$inferSelect, driver?: typeof driversTable.$inferSelect | null) {
  return {
    id: ride.id,
    clientName: ride.clientName,
    clientPhone: ride.clientPhone,
    pickupLocation: ride.pickupLocation,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLocation: ride.dropoffLocation,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    distanceKm: ride.distanceKm,
    driverId: ride.driverId,
    driver: driver ? {
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
    } : null,
    status: ride.status,
    estimatedFare: ride.estimatedFare,
    finalFare: ride.finalFare,
    notes: ride.notes,
    scheduledAt: ride.scheduledAt,
    createdAt: ride.createdAt,
    acceptedAt: ride.acceptedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
  };
}

router.get("/rides", async (req, res) => {
  try {
    const { driverId, status } = req.query;
    let rides: (typeof ridesTable.$inferSelect)[] = [];

    if (driverId && status) {
      rides = await db.select().from(ridesTable)
        .where(and(eq(ridesTable.driverId, parseInt(driverId as string)), eq(ridesTable.status, status as any)));
    } else if (driverId) {
      rides = await db.select().from(ridesTable)
        .where(eq(ridesTable.driverId, parseInt(driverId as string)));
    } else if (status) {
      rides = await db.select().from(ridesTable)
        .where(eq(ridesTable.status, status as any));
    } else {
      rides = await db.select().from(ridesTable);
    }

    const driverIds = [...new Set(rides.filter(r => r.driverId).map(r => r.driverId!))];
    const drivers: Record<number, typeof driversTable.$inferSelect> = {};
    if (driverIds.length > 0) {
      const driverList = await db.select().from(driversTable);
      driverList.forEach(d => { drivers[d.id] = d; });
    }

    return res.json(rides.map(r => formatRide(r, r.driverId ? drivers[r.driverId] : null)));
  } catch (err) {
    req.log.error({ err }, "Failed to list rides");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/rides", async (req, res) => {
  try {
    const { clientName, clientPhone, pickupLocation, pickupLat, pickupLng, dropoffLocation, dropoffLat, dropoffLng, notes, scheduledAt } = req.body;
    if (!clientName || !clientPhone || !pickupLocation || pickupLat == null || pickupLng == null || !dropoffLocation || dropoffLat == null || dropoffLng == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const distanceKm = haversineKm(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropoffLat),
      parseFloat(dropoffLng),
    );
    const estimatedFare = calcFare(distanceKm);

    const [ride] = await db.insert(ridesTable).values({
      clientName,
      clientPhone,
      pickupLocation,
      pickupLat: parseFloat(pickupLat),
      pickupLng: parseFloat(pickupLng),
      dropoffLocation,
      dropoffLat: parseFloat(dropoffLat),
      dropoffLng: parseFloat(dropoffLng),
      distanceKm,
      estimatedFare,
      notes: notes || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt && new Date(scheduledAt) > new Date() ? "scheduled" : "pending",
    }).returning();

    return res.status(201).json(formatRide(ride, null));
  } catch (err) {
    req.log.error({ err }, "Failed to create ride");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/rides/:rideId", async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    if (isNaN(rideId)) return res.status(400).json({ error: "Invalid ride ID" });
    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId));
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    let driver: typeof driversTable.$inferSelect | null = null;
    if (ride.driverId) {
      const [d] = await db.select().from(driversTable).where(eq(driversTable.id, ride.driverId));
      driver = d || null;
    }
    return res.json(formatRide(ride, driver));
  } catch (err) {
    req.log.error({ err }, "Failed to get ride");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/rides/:rideId/status", async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    if (isNaN(rideId)) return res.status(400).json({ error: "Invalid ride ID" });

    const [existingRide] = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId));
    if (!existingRide) return res.status(404).json({ error: "Ride not found" });

    const { status, driverId } = req.body;
    const validStatuses = ["scheduled", "pending", "accepted", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updates: Partial<typeof ridesTable.$inferInsert> = { status };

    if (status === "accepted") {
      if (!driverId) return res.status(400).json({ error: "driverId required when accepting a ride" });
      const acceptedDriverId = parseInt(driverId);
      updates.driverId = acceptedDriverId;
      updates.acceptedAt = new Date();
      await db.update(driversTable).set({ status: "busy" }).where(eq(driversTable.id, acceptedDriverId));

      // Fetch driver info for auto-messages
      const [acceptedDriver] = await db.select().from(driversTable).where(eq(driversTable.id, acceptedDriverId));
      const fare = existingRide.estimatedFare.toFixed(2);
      const distMi = (existingRide.distanceKm * 0.621371).toFixed(1);

      const confirmMsg = `✅ Your GoRide booking #${rideId} is confirmed! Thank you for choosing GoRide — Nassau's trusted ride service. We're matching you with a driver now.`;
      const driverMsg = acceptedDriver
        ? `🚗 Driver on the way! ${acceptedDriver.name} is heading to you.\n\nVehicle: ${acceptedDriver.vehicleColor} ${acceptedDriver.vehicleYear} ${acceptedDriver.vehicleMake} ${acceptedDriver.vehicleModel}\nPlate: ${acceptedDriver.vehiclePlate}\nRating: ⭐ ${acceptedDriver.rating.toFixed(1)}\n\nETA: ~10 min · Estimated fare: $${fare} (~${distMi} mi)`
        : `🚗 A driver has been assigned to your ride. Estimated fare: $${fare}. ETA ~10 min.`;

      await db.insert(rideMessagesTable).values([
        { rideId, sender: "GoRide", senderType: "system", body: confirmMsg },
        { rideId, sender: "GoRide", senderType: "system", body: driverMsg },
      ]);
    }
    if (status === "in_progress") {
      updates.startedAt = new Date();
    }
    if (status === "completed") {
      updates.completedAt = new Date();
      const finalFare = existingRide.estimatedFare;
      updates.finalFare = finalFare;

      if (existingRide.driverId) {
        const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, existingRide.driverId));
        if (driver) {
          await db.update(driversTable).set({
            status: "available",
            totalRides: driver.totalRides + 1,
          }).where(eq(driversTable.id, existingRide.driverId));
        }

        const distanceFare = Math.round(RATE_PER_KM * existingRide.distanceKm * 100) / 100;
        await db.insert(billsTable).values({
          rideId: existingRide.id,
          driverId: existingRide.driverId,
          clientName: existingRide.clientName,
          pickupLocation: existingRide.pickupLocation,
          dropoffLocation: existingRide.dropoffLocation,
          distanceKm: existingRide.distanceKm,
          baseFare: BASE_FARE,
          distanceFare,
          totalFare: finalFare,
          currency: "USD",
          status: "unpaid",
        });
      }
    }
    if (status === "cancelled" && existingRide.driverId) {
      await db.update(driversTable).set({ status: "available" }).where(eq(driversTable.id, existingRide.driverId));
    }

    const [updatedRide] = await db.update(ridesTable).set(updates).where(eq(ridesTable.id, rideId)).returning();

    let driver: typeof driversTable.$inferSelect | null = null;
    if (updatedRide.driverId) {
      const [d] = await db.select().from(driversTable).where(eq(driversTable.id, updatedRide.driverId));
      driver = d || null;
    }
    return res.json(formatRide(updatedRide, driver));
  } catch (err) {
    req.log.error({ err }, "Failed to update ride status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/rides/:rideId/messages
router.get("/rides/:rideId/messages", async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    if (isNaN(rideId)) return res.status(400).json({ error: "Invalid ride ID" });
    const msgs = await db
      .select()
      .from(rideMessagesTable)
      .where(eq(rideMessagesTable.rideId, rideId))
      .orderBy(asc(rideMessagesTable.createdAt));
    return res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ride messages");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
