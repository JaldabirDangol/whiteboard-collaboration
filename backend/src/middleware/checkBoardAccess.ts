import type { Request, Response, NextFunction } from "express";
import { getBoardMember } from "@/controllers/boards/boardServices.js";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

/**
 * Middleware that checks whether the authenticated user has (at least)
 * the required role on the board identified by `req.params.id`.
 *
 * Usage:
 *   router.post('/boards/:id/objects', checkBoardAccess('EDITOR'), handler)
 */
export const checkBoardAccess = (requiredRole: Role) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const boardId = (req.params.id ?? req.params.boardId) as string | undefined;
    if (!boardId) {
      return res.status(400).json({ error: "Board ID is required" });
    }

    const membership = await getBoardMember(boardId as string, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

    const userLevel = ROLE_HIERARCHY[membership.role as Role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Requires ${requiredRole} role or higher`,
      });
    }

    next();
  };
};
