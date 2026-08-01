import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";

const router = Router();

// GET /api/study-groups — current user's groups
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const groups = await storage.getStudyGroupsByUser(userId);
    res.json(groups);
  } catch (error) {
    console.error("Study-groups error:", error);
    res.status(500).json({
      message: "Unable to retrieve study groups",
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
        .json({ message: "Group name is required" });
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
    console.error("Group creation error:", error);
    res
      .status(500)
      .json({ message: "Error while creating the group" });
  }
});

// GET /api/study-groups/:id/members — must be declared BEFORE /:id
router.get("/:id/members", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid id" });
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
            : { id: member.userId, username: "unknown", displayName: null, avatar: null },
        };
      })
    );
    res.json(withUsers);
  } catch (error) {
    console.error("Group members error:", error);
    res
      .status(500)
      .json({ message: "Unable to retrieve group members" });
  }
});

// GET /api/study-groups/:id/shared-notes
router.get("/:id/shared-notes", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid id" });
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
    console.error("Shared notes error:", error);
    res
      .status(500)
      .json({ message: "Unable to retrieve shared notes" });
  }
});

// POST /api/study-groups/:id/shared-notes — shares a note in the group
router.post("/:id/shared-notes", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const { noteId, permissions } = req.body;
    if (!noteId) {
      return res
        .status(400)
        .json({ message: "Please select a note to share" });
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
    console.error("Note sharing error:", error);
    res
      .status(500)
      .json({ message: "Error while sharing the note" });
  }
});

// GET /api/study-groups/:id
router.get("/:id", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const group = await storage.getStudyGroup(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ message: "The requested study group does not exist" });
    }
    res.json(group);
  } catch (error) {
    console.error("Group error:", error);
    res.status(500).json({
      message: "Unable to retrieve group details",
    });
  }
});

export default router;
