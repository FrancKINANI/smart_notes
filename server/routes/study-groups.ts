import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";

const router = Router();

// GET /api/study-groups — groupes de l'utilisateur courant
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const groups = await storage.getStudyGroupsByUser(userId);
    res.json(groups);
  } catch (error) {
    console.error("Erreur study-groups:", error);
    res.status(500).json({
      message: "Impossible de récupérer les groupes d'étude",
    });
  }
});

// POST /api/study-groups
router.post("/", async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ message: "Le nom du groupe est requis" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const group = await storage.createStudyGroup({
      name: String(name).trim(),
      description: description ? String(description) : null,
      creatorId: userId,
      isPrivate: Boolean(isPrivate),
    });
    res.status(201).json(group);
  } catch (error) {
    console.error("Erreur création groupe:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création du groupe" });
  }
});

// GET /api/study-groups/:id/members — doit être déclarée AVANT /:id
router.get("/:id/members", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Identifiant invalide" });
    }
    const members = await storage.getGroupMembers(groupId);
    const withUsers = await Promise.all(
      members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          user: user
            ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
              }
            : { id: member.userId, username: "inconnu", displayName: null, avatar: null },
        };
      })
    );
    res.json(withUsers);
  } catch (error) {
    console.error("Erreur membres groupe:", error);
    res
      .status(500)
      .json({ message: "Impossible de récupérer les membres du groupe" });
  }
});

// GET /api/study-groups/:id/shared-notes
router.get("/:id/shared-notes", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Identifiant invalide" });
    }
    const shared = await storage.getSharedNotes(groupId);
    const enriched = await Promise.all(
      shared.map(async (item) => {
        const note = await storage.getNote(item.noteId);
        const sharedByUser = await storage.getUser(item.sharedBy);
        return {
          ...item,
          note: note
            ? {
                id: note.id,
                title: note.title,
                content: note.content,
                summary: note.summary,
                createdAt: note.createdAt,
              }
            : null,
          sharedByUser: sharedByUser
            ? {
                id: sharedByUser.id,
                username: sharedByUser.username,
                displayName: sharedByUser.displayName,
              }
            : null,
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    console.error("Erreur notes partagées:", error);
    res
      .status(500)
      .json({ message: "Impossible de récupérer les notes partagées" });
  }
});

// POST /api/study-groups/:id/shared-notes — partage une note dans le groupe
router.post("/:id/shared-notes", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Identifiant invalide" });
    }
    const { noteId, permissions } = req.body;
    if (!noteId) {
      return res
        .status(400)
        .json({ message: "Veuillez sélectionner une note à partager" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const shared = await storage.shareNote({
      noteId: Number(noteId),
      groupId,
      sharedBy: userId,
      permissions: permissions ? String(permissions) : "read",
    });
    res.status(201).json(shared);
  } catch (error) {
    console.error("Erreur partage note:", error);
    res
      .status(500)
      .json({ message: "Erreur lors du partage de la note" });
  }
});

// GET /api/study-groups/:id
router.get("/:id", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Identifiant invalide" });
    }
    const group = await storage.getStudyGroup(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ message: "Le groupe d'étude demandé n'existe pas" });
    }
    res.json(group);
  } catch (error) {
    console.error("Erreur groupe:", error);
    res.status(500).json({
      message: "Impossible de récupérer les détails du groupe",
    });
  }
});

export default router;
