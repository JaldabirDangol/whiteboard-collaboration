import type { Request, Response } from "express";
import * as commentService from "./commentService.js";
import { getIO } from "@/socket/index.js";
import { getBoardMember } from "@/controllers/boards/boardServices.js";

interface CreateCommentBody {
  shapeId: string;
  content: string;
  boardId: string;
}

export const createComment = async (
  req: Request<{}, {}, CreateCommentBody>,
  res: Response,
) => {
  try {
    const { shapeId, content, boardId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content cannot be empty" });
    }

    if (content.length > 5000) {
      return res.status(400).json({ message: "Comment content must be under 5000 characters" });
    }

    if (!shapeId || typeof shapeId !== "string") {
      return res.status(400).json({ message: "Shape ID is required" });
    }

    if (!boardId || typeof boardId !== "string") {
      return res.status(400).json({ message: "Board ID is required" });
    }

    const membership = await getBoardMember(boardId, userId);
    if (!membership) {
      return res.status(403).json({ message: "You do not have access to this board" });
    }

    const comment = await commentService.createComment({
      boardId,
      shapeId,
      userId,
      content: content.trim(),
    });

    const io = getIO();
    io.to(boardId).emit("comment:new", comment);
    res.status(201).json({ message: "Comment created", data: comment });
  } catch (error) {
    console.error("[CreateComment Error]:", error);
    res.status(500).json({ message: "Failed to create comment" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { boardId } = req.query;
    const userId = req.user?.id;

    if (!boardId || typeof boardId !== "string") {
      return res.status(400).json({ message: "Board ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const membership = await getBoardMember(boardId, userId);
    if (!membership) {
      return res.status(403).json({ message: "You do not have access to this board" });
    }

    const deleted = await commentService.deleteComment(id as string, userId);

    if (!deleted) {
      return res.status(404).json({ message: "Comment not found or unauthorized" });
    }

    const io = getIO();
    io.to(boardId).emit("comment:removed", { commentId: id, shapeId: req.query.shapeId as string });
    res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("[DeleteComment Error]:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

export const getCommentsByShape = async (req: Request, res: Response) => {
  try {
    const { shapeId } = req.params;
    const userId = req.user?.id;

    if (!shapeId) {
      return res.status(400).json({ message: "Shape ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comments = await commentService.getCommentsByShape(shapeId as string);
    res.status(200).json(comments);
  } catch (error) {
    console.error("[GetCommentsByShape Error]:", error);
    res.status(500).json({ message: "Failed to retrieve comments" });
  }
};

export const getCommentCountsByBoard = async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.id;

    if (!boardId) return res.status(400).json({ message: "Board ID is required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const membership = await getBoardMember(boardId as string, userId);
    if (!membership) {
      return res.status(403).json({ message: "You do not have access to this board" });
    }

    const counts = await commentService.getCommentCountsByBoard(boardId as string);
    res.status(200).json(counts);
  } catch (error) {
    console.error("[GetCommentCountsByBoard Error]:", error);
    res.status(500).json({ message: "Failed to retrieve comment counts" });
  }
};

export const getCommentsByBoard = async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.id;

    if (!boardId) {
      return res.status(400).json({ message: "Board ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const membership = await getBoardMember(boardId as string, userId);
    if (!membership) {
      return res.status(403).json({ message: "You do not have access to this board" });
    }

    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string, 10) : undefined;
    const comments = await commentService.getCommentsByBoard(boardId as string, skip, take);
    res.status(200).json(comments);
  } catch (error) {
    console.error("[GetCommentsByBoard Error]:", error);
    res.status(500).json({ message: "Failed to retrieve comments" });
  }
};
