import { type Request, type Response } from "express";

/**
 * Extracts the first JSON array from an LLM output text (tolerates
 * ```json blocks, introductory text, etc.). Returns null if no valid
 * array is found.
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
      /* ignore, try the rest */
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
 * Extracts the first JSON object from an LLM output text.
 * Returns null if no valid object is found.
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
 * Resolves the user id to use for a request:
 *   1. the session user (req.user) when authenticated,
 *   2. the `userId` parameter (query or body) — demo/offline mode,
 *   3. null otherwise (→ 401).
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
    res.status(401).json({ message: "Authentication required (userId not found)" });
    return null;
  }
  return id;
}
