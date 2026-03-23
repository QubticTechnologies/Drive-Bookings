import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    isVerified: user.isVerified,
    preferredLanguage: user.preferredLanguage,
    profilePictureUrl: user.profilePictureUrl,
    totalRides: user.totalRides,
    rating: parseFloat(user.rating ?? "5.0"),
    createdAt: user.createdAt,
  };
}

// POST /users/send-code — create or update user with a fresh verification code
router.post("/users/send-code", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const normalized = phoneNumber.trim();
    const code = generateCode();

    // Upsert: create or update verification code
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.phoneNumber, normalized));

    let user: typeof usersTable.$inferSelect;
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ verificationCode: code, updatedAt: new Date() })
        .where(eq(usersTable.phoneNumber, normalized))
        .returning();
      user = updated;
    } else {
      const [created] = await db
        .insert(usersTable)
        .values({ phoneNumber: normalized, verificationCode: code, userType: "rider" })
        .returning();
      user = created;
    }

    // In production, send via SMS. In dev, return the code directly.
    const response: Record<string, unknown> = {
      message: "Verification code sent",
      userId: user.id,
    };
    if (process.env.NODE_ENV !== "production") {
      response.devCode = code;
    }

    return res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to send verification code");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /users/verify — verify the code and mark user as verified
router.post("/users/verify", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: "Phone number and code are required" });
    }
    const normalized = phoneNumber.trim();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phoneNumber, normalized));
    if (!user) {
      return res.status(404).json({ error: "User not found. Please request a code first." });
    }
    if (user.verificationCode !== code.trim()) {
      return res.status(400).json({ error: "Invalid verification code." });
    }
    const [verified] = await db
      .update(usersTable)
      .set({ isVerified: true, verificationCode: null, lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.phoneNumber, normalized))
      .returning();
    return res.json(formatUser(verified));
  } catch (err) {
    req.log.error({ err }, "Failed to verify code");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:userId
router.get("/users/:userId", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(formatUser(user));
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /users/:userId — update profile
router.patch("/users/:userId", async (req, res) => {
  try {
    const { firstName, lastName, preferredLanguage, profilePictureUrl } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(preferredLanguage !== undefined && { preferredLanguage }),
        ...(profilePictureUrl !== undefined && { profilePictureUrl }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.params.userId))
      .returning();
    return res.json(formatUser(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
