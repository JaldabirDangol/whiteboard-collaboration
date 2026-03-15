import type { Request, Response, NextFunction } from "express";
import * as messageService from "./messageService.js";
import { getIO } from "@/socket/index.js"
interface SendMessageBody {
  boardId: string;
  content: string;
}

interface messageResponse <T = any> {
  message?:string,
  data?: T,
  error?: string
}

export const sendMessage = async (
  req: Request<{}, {}, SendMessageBody>, 
  res: Response<messageResponse>,
) => {
  try {
    const { boardId, content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const message = await messageService.createMessage({
      boardId,
      userId,
      content: content.trim()
    });
    
    const io = getIO();
    io.to(boardId).emit("messageSent", message);
    res.status(201).json({ message: "Message sent", data: message });
  } catch (error) {
    console.error(`[SendMessage Error]:`, error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const deleteMessage = async (req: Request, res: Response<messageResponse>) => {
  try {
    const { id } = req.params;
    const { boardId } = req.query;
    const userId = req.user?.id;

    if(!boardId || typeof boardId !== "string") {
      return res.status(400).json({ message: "Board ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const deleted = await messageService.deleteMessage(id as string, userId as string);

    if (!deleted) {
      return res.status(404).json({ message: "Message not found or unauthorized" });
    }


    const io = getIO();
    io.to(boardId).emit("messageDeleted", id);
    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error(`[DeleteMessage Error]:`, error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const getMessagesByBoard = async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    if (!boardId) {
      return res.status(400).json({ message: "Board ID is required" });
    }
    const messages = await messageService.getMessagesByBoard(boardId as string);
    res.status(200).json(messages);
  } catch (error) {
    console.error(`[GetMessagesByBoard Error]:`, error);
    res.status(500).json({ message: "Failed to retrieve messages" });
  }
}
