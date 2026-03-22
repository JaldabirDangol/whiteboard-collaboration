import type { Request, Response } from "express";
import * as boardService from "./boardServices.js";
import { prisma } from "@/lib/prisma.js";

export async function createBoard(req: Request, res: Response) {
  try {
   const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    let board = await prisma.board.findUnique({
      where:{
        title: req.body.title,
      }
    })

    if (board) {
      return res.status(400).json({ error: "Board with this title already exists" });
    }
     board = await boardService.createBoard(req.body);
    return res.status(201).json(board);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getBoard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Board ID is required" });
    console.log("controll reached here :", id);
    console.log("Fetching board with ID:", id);
    const board = await boardService.getBoard(id as string);
    if (!board) return res.status(404).json({ error: "Board not found" });
   
    console.log("Fetched board:", board);
    return res.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getBoardsForUser(req: Request, res: Response) {
  try {
   
  const userId = req.user?.id;
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