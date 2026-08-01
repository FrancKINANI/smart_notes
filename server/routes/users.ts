import { Router } from "express";
import { storage } from "../storage";
import type { InsertUser } from "@shared/schema";
import { z } from "zod";

const router = Router();

const updateProfileSchema = z
  .object({
    displayName: z.string().max(255).optional().nullable(),
    firstName: z.string().max(100).optional().nullable(),
    lastName: z.string().max(100).optional().nullable(),
    bio: z.string().max(2000).optional().nullable(),
    avatar: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "No field to update" }
  );

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must contain at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm the new password"),
});

// PUT /api/users/:id — profile update
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // Only the logged-in user can modify their own profile
    if (!req.isAuthenticated() || !req.user || req.user.id !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.errors[0]?.message ?? "Invalid data" });
    }

    const data = parsed.data;
    // bio/avatar exist in the DB (users columns) but not in InsertUser:
    // typed cast consistent with storage.ts.
    const user = await storage.updateUser(
      id,
      {
        displayName: data.displayName ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        bio: data.bio ?? null,
        avatar: data.avatar ?? null,
      } as Partial<InsertUser>
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user?.id,
      username: user?.username,
      email: user?.email,
      displayName: user?.displayName,
      firstName: user?.firstName,
      lastName: user?.lastName,
      bio: user?.bio,
      avatar: user?.avatar,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res
      .status(500)
      .json({ message: "Error while updating the profile" });
  }
});

// PUT /api/users/:id/password — password change
router.put("/:id/password", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!req.isAuthenticated() || !req.user || req.user.id !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.errors[0]?.message ?? "Invalid data" });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return res
        .status(400)
        .json({ message: "The new passwords do not match" });
    }

    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await storage.verifyPassword(
      parsed.data.currentPassword,
      user.password
    );
    if (!isValid) {
      return res
        .status(401)
        .json({ message: "The current password is incorrect" });
    }

    await storage.updateUser(id, { password: parsed.data.newPassword });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res
      .status(500)
      .json({ message: "Error while changing the password" });
  }
});

export default router;
