import type { Request, Response } from "express";
import * as settingsService from "./boardSettingsService.js";
import { getBoardMember } from "./boardServices.js";

export async function getSettings(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const membership = await getBoardMember(boardId, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

    const settings = await settingsService.getBoardSettings(boardId);
    return res.json(settings ?? { boardId, isPublic: false, password: null });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const membership = await getBoardMember(boardId, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }
    if (membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { isPublic, password } = req.body;
    const settings = await settingsService.upsertBoardSettings(boardId, {
      isPublic,
      password,
    });

    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
