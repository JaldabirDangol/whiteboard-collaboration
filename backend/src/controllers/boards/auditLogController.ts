import type { Request, Response } from "express";
import { getLogsForBoard } from "@/lib/auditLog.js";
import { getBoardMember } from "@/controllers/boards/boardServices.js";

export async function getBoardLogs(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const membership = await getBoardMember(boardId, userId);
    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only board admins can view audit logs" });
    }

    const logs = await getLogsForBoard(boardId);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
