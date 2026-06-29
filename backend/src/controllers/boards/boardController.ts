import type { Request, Response } from "express";
import * as boardService from "./boardServices.js";
import { prisma } from "@/lib/prisma.js";
import { logAction } from "@/lib/auditLog.js";

export async function createBoard(req: Request, res: Response) {
  try {
   const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if(!req.body) return res.status(400).json({error:"title is required"})

    let board = await prisma.board.findUnique({
      where:{
        title: req.body.title,
      }
    })

    if (board) {
      return res.status(400).json({ error: "Board with this title already exists" });
    }
     board = await boardService.createBoard({...req.body , userId});
    await logAction({ boardId: board.id, userId, action: "board.created", metadata: { title: board.title } });
    return res.status(201).json(board);
  } catch (error) {
    console.error(error)
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getBoard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "Board ID is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const membership = await boardService.getBoardMember(id as string, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

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

    const { filter, search, sort, order } = req.query as {
      filter?: "all" | "starred" | "shared" | "recent";
      search?: string;
      sort?: "updatedAt" | "createdAt" | "title";
      order?: "asc" | "desc";
    };

    const boards = await boardService.getBoardsForUser(userId, { filter, search, sort, order });
    return res.json(boards);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getBoardShapes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) return res.status(400).json({ error: "Board ID is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const membership = await boardService.getBoardMember(id as string, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

    const shapes = await boardService.getBoardShapesFromDatabase(id as string);
    return res.json({ shapes });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function updateBoardMember(req: Request, res: Response) {
  try {
    const { id: boardId } = req.params;
    const { userId, role } = req.body;
    const actorUserId = req.user?.id;

    if (!boardId || !userId) {
      return res.status(400).json({ error: "Board ID and User ID are required" });
    }

    if (!actorUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const actorMembership = await boardService.getBoardMember(boardId as string, actorUserId);
    if (!actorMembership || actorMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only board admins can update member roles" });
    }

    const member = await boardService.updateBoardMember(boardId as string, userId, role || "VIEWER");
    return res.json({ message: "Member updated successfully", member });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function shareBoard(req: Request, res: Response) {
  try {
    const { id: boardIdParam } = req.params;
    const ownerUserId = req.user?.id;
    const { email, role } = req.body as { email?: string; role?: "EDITOR" | "VIEWER" };
    const boardId = Array.isArray(boardIdParam) ? boardIdParam[0] : boardIdParam;

    if (!boardId) {
      return res.status(400).json({ error: "Board ID is required" });
    }

    if (!ownerUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const nextRole = role === "EDITOR" ? "EDITOR" : "VIEWER";

    const result = await boardService.shareBoardWithEmail(
      boardId,
      ownerUserId,
      email.trim().toLowerCase(),
      nextRole
    );

    await logAction({ boardId, userId: ownerUserId, action: "board.shared", metadata: { email: email.trim().toLowerCase(), role: nextRole } });

    return res.json({
      message: "Board shared successfully",
      member: result.member,
      user: result.user,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function joinBoard(req: Request, res: Response) {
  try {
    const { id: boardIdParam } = req.params;
    const userId = req.user?.id;
    const boardId = Array.isArray(boardIdParam) ? boardIdParam[0] : boardIdParam;

    if (!boardId) {
      return res.status(400).json({ error: "Board ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await boardService.joinBoard(boardId, userId);
    return res.json({
      message: "Joined board successfully",
      board: result.board,
      member: result.member,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function deleteBoard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const actorUserId = req.user?.id;

    if (!id) return res.status(400).json({ error: "Board ID is required" });
    if (!actorUserId) return res.status(401).json({ error: "Unauthorized" });

    const actorMembership = await boardService.getBoardMember(id as string, actorUserId);
    if (!actorMembership || actorMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only board admins can delete this board" });
    }

    const board = await boardService.deleteBoard(id as string);
    await logAction({ boardId: id as string, userId: actorUserId, action: "board.deleted", metadata: { title: board.title } });
    return res.json({
      message: "Board deleted successfully",
      boardTitle: board.title,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function toggleStar(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) return res.status(400).json({ error: "Board ID is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const membership = await boardService.getBoardMember(id as string, userId);
    if (!membership) {
      return res.status(403).json({ error: "You do not have access to this board" });
    }

    const updated = await boardService.toggleStar(id as string, userId);
    return res.json({ isStarred: updated.isStarred });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const { id: boardId, userId: targetUserId } = req.params;
    const actorUserId = req.user?.id;

    if (!boardId) return res.status(400).json({ error: "Board ID is required" });
    if (!targetUserId) return res.status(400).json({ error: "User ID is required" });
    if (!actorUserId) return res.status(401).json({ error: "Unauthorized" });

    const actorMembership = await boardService.getBoardMember(boardId, actorUserId);
    if (!actorMembership || actorMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only board admins can remove members" });
    }

    if (targetUserId === actorUserId) {
      return res.status(400).json({ error: "You cannot remove yourself" });
    }

    await boardService.removeMember(boardId, targetUserId);
    return res.json({ message: "Member removed successfully" });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}