import type { Request, Response } from "express";
import * as boardService from "./boardServices.js";
import { prisma } from "@/lib/prisma.js";
import { createNotification } from "@/controllers/notifications/notificationController.js";
import { getIO } from "@/socket/index.js";
import { destroyYDoc } from "@/socket/yjs.js";

export async function createBoard(req: Request, res: Response) {
  try {
   const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if(!req.body.title) return res.status(400).json({error:"title is required"})

    let board = await prisma.board.findFirst({
      where:{
        title: req.body.title,
      }
    })

    if (board) {
      return res.status(400).json({ error: "Board with this title already exists" });
    }
     board = await boardService.createBoard({...req.body , userId});
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

    const { filter, search, sort, order, skip, take } = req.query as Record<string, string | undefined>;

    const result = await boardService.getBoardsForUser(userId, {
      filter: filter as "all" | "starred" | "shared" | "recent" | undefined,
      search,
      sort: sort as "updatedAt" | "createdAt" | "title" | undefined,
      order: order as "asc" | "desc" | undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
    return res.json(result);
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

    if (role !== "ADMIN" && role !== "EDITOR" && role !== "VIEWER") {
      return res.status(400).json({ error: "Invalid role. Must be ADMIN, EDITOR, or VIEWER" });
    }
    const member = await boardService.updateBoardMember(boardId as string, userId, role);
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

    const result = await boardService.inviteByEmail(
      boardId,
      ownerUserId,
      email.trim().toLowerCase(),
      nextRole
    );

    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { title: true } });
    const notification = await createNotification(
      result.user.id,
      "share_invite",
      `You've been invited as ${nextRole.toLowerCase()} to "${board?.title ?? "a board"}"`,
      boardId,
      { sharedBy: ownerUserId, role: nextRole, status: "pending" }
    ).catch((err) => {
      console.error("[createNotification] Failed to create notification:", err);
      throw err;
    });

    return res.json({
      message: "Invitation sent successfully",
      notification,
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

    const board = await boardService.getBoard(id as string);
    if (!board) return res.status(404).json({ error: "Board not found" });

    await boardService.deleteBoard(id as string);

    // Notify connected users and clean up Y.Doc
    try {
      getIO().to(id as string).emit("board:deleted", { boardId: id });
    } catch { /* socket not initialized — fine for REST-only usage */ }
    destroyYDoc(id as string);

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

export async function acceptInvitation(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.type !== "share_invite") {
      return res.status(400).json({ error: "Not an invitation" });
    }

    const meta = notification.metadata as { status?: string; role?: string; sharedBy?: string } | null;
    if (!meta || meta.status !== "pending") {
      return res.status(400).json({ error: "Invitation is not pending" });
    }

    const role = (meta.role === "EDITOR" ? "EDITOR" : "VIEWER") as "EDITOR" | "VIEWER";
    const boardId = notification.boardId;
    if (!boardId) return res.status(400).json({ error: "Invalid invitation" });

    const member = await boardService.acceptBoardInvitation(notificationId, userId, boardId, role);

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        metadata: { ...meta, status: "accepted" },
      },
    });

    const io = getIO();
    io.to(`user:${userId}`).emit("notification:updated", { id: notificationId });

    return res.json({ message: "Invitation accepted", member });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function declineInvitation(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.type !== "share_invite") {
      return res.status(400).json({ error: "Not an invitation" });
    }

    const meta = notification.metadata as { status?: string } | null;
    if (!meta || meta.status !== "pending") {
      return res.status(400).json({ error: "Invitation is not pending" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        metadata: { ...meta, status: "declined" },
      },
    });

    const io = getIO();
    io.to(`user:${userId}`).emit("notification:updated", { id: notificationId });

    return res.json({ message: "Invitation declined" });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}