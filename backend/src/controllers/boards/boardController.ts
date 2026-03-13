import type { Request, Response } from "express";
import * as boardService from "./boardServices.js";

export async function createBoard(req: Request, res: Response) {
  try {
    const board = await boardService.createBoard(req.body);
    return res.status(201).json(board);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getBoard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Board ID is required" });

    const board = await boardService.getBoard(id as string);
    if (!board) return res.status(404).json({ error: "Board not found" });

    return res.json(board);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getBoardsForUser(req: Request, res: Response) {
  try {
    const { userId } = req.body; // Ideally from req.user if using Auth middleware
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const boards = await boardService.getBoardsForUser(userId);
    return res.json(boards);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function updateBoardMember(req: Request, res: Response) {
  try {
    const { id: boardId } = req.params;
    const { userId, role } = req.body;

    if (!boardId || !userId) {
      return res.status(400).json({ error: "Board ID and User ID are required" });
    }

    const member = await boardService.updateBoardMember(boardId as string, userId, role || "MEMBER");
    return res.json({ message: "Member updated successfully", member });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function deleteBoard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Board ID is required" });

    const board = await boardService.deleteBoard(id as string);
    return res.json({
      message: "Board deleted successfully",
      boardTitle: board.title,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}