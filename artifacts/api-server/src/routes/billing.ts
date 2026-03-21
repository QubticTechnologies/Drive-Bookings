import { Router, type IRouter } from "express";
import { db, billsTable, ridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/rides/:rideId/billing", async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    if (isNaN(rideId)) return res.status(400).json({ error: "Invalid ride ID" });

    const [bill] = await db.select().from(billsTable).where(eq(billsTable.rideId, rideId));
    if (!bill) return res.status(404).json({ error: "No bill found for this ride" });

    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId));

    return res.json({
      id: bill.id,
      rideId: bill.rideId,
      ride: ride ? {
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
        driver: null,
        status: ride.status,
        estimatedFare: ride.estimatedFare,
        finalFare: ride.finalFare,
        notes: ride.notes,
        createdAt: ride.createdAt,
        acceptedAt: ride.acceptedAt,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
      } : null,
      driverId: bill.driverId,
      clientName: bill.clientName,
      pickupLocation: bill.pickupLocation,
      dropoffLocation: bill.dropoffLocation,
      distanceKm: bill.distanceKm,
      baseFare: bill.baseFare,
      distanceFare: bill.distanceFare,
      totalFare: bill.totalFare,
      currency: bill.currency,
      status: bill.status,
      createdAt: bill.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get billing");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bills", async (req, res) => {
  try {
    const { driverId } = req.query;
    let bills: (typeof billsTable.$inferSelect)[];

    if (driverId) {
      bills = await db.select().from(billsTable).where(eq(billsTable.driverId, parseInt(driverId as string)));
    } else {
      bills = await db.select().from(billsTable);
    }

    return res.json(bills.map(bill => ({
      id: bill.id,
      rideId: bill.rideId,
      ride: null,
      driverId: bill.driverId,
      clientName: bill.clientName,
      pickupLocation: bill.pickupLocation,
      dropoffLocation: bill.dropoffLocation,
      distanceKm: bill.distanceKm,
      baseFare: bill.baseFare,
      distanceFare: bill.distanceFare,
      totalFare: bill.totalFare,
      currency: bill.currency,
      status: bill.status,
      createdAt: bill.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list bills");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
