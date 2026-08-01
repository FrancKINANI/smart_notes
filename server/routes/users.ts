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
    { message: "Aucun champ à mettre à jour" }
  );

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(1, "Veuillez confirmer le nouveau mot de passe"),
});

// PUT /api/users/:id — mise à jour du profil
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Identifiant invalide" });
    }

    // Seul l'utilisateur connecté peut modifier son propre profil
    if (!req.isAuthenticated() || !req.user || req.user.id !== id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.errors[0]?.message ?? "Données invalides" });
    }

    const data = parsed.data;
    // bio/avatar existent en DB (colonnes users) mais pas dans InsertUser :
    // cast typé cohérent avec storage.ts.
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
      return res.status(404).json({ message: "Utilisateur introuvable" });
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
    console.error("Erreur mise à jour profil:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour du profil" });
  }
});

// PUT /api/users/:id/password — changement de mot de passe
router.put("/:id/password", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!req.isAuthenticated() || !req.user || req.user.id !== id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.errors[0]?.message ?? "Données invalides" });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return res
        .status(400)
        .json({ message: "Les nouveaux mots de passe ne correspondent pas" });
    }

    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const isValid = await storage.verifyPassword(
      parsed.data.currentPassword,
      user.password
    );
    if (!isValid) {
      return res
        .status(401)
        .json({ message: "Le mot de passe actuel est incorrect" });
    }

    await storage.updateUser(id, { password: parsed.data.newPassword });

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    console.error("Erreur changement mot de passe:", error);
    res
      .status(500)
      .json({ message: "Erreur lors du changement de mot de passe" });
  }
});

export default router;
