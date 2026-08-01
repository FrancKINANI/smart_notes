import { type Request, type Response } from "express";

/**
 * Extrait le premier tableau JSON d'un texte de sortie LLM (tolère les
 * blocs ```json, le texte d'introduction, etc.). Retourne null si aucun
 * tableau valide n'est trouvé.
 */
export function extractJsonArray(text: string): unknown[] | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore, on essaie la suite */
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Extrait le premier objet JSON d'un texte de sortie LLM.
 * Retourne null si aucun objet valide n'est trouvé.
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Résout l'id utilisateur à utiliser pour une requête :
 *   1. l'utilisateur de session (req.user) quand authentifié,
 *   2. le paramètre `userId` (query ou body) — mode démo/offline,
 *   3. null sinon (→ 401).
 */
export function resolveUserId(
  req: Request,
  res: Response
): number | null {
  const fromAuth = (req as Request & { user?: { id?: number } }).user?.id;
  const raw =
    typeof req.query.userId === "string"
      ? req.query.userId
      : typeof req.body?.userId === "number" || typeof req.body?.userId === "string"
        ? req.body.userId
        : undefined;

  const id = fromAuth ?? (raw !== undefined ? parseInt(String(raw), 10) : undefined);

  if (id === undefined || Number.isNaN(id)) {
    res.status(401).json({ message: "Authentification requise (userId introuvable)" });
    return null;
  }
  return id;
}
