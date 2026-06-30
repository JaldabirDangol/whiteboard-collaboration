import type { Request, Response } from "express";
import { getLogsForBoardWithUsers } from "@/lib/auditLog.js";
import { getBoardMember } from "@/controllers/boards/boardServices.js";

export async function getBoardLogs(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const membership = await getBoardMember(boardId, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string, 10) : undefined;
    const logs = await getLogsForBoardWithUsers(boardId, skip, take);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
