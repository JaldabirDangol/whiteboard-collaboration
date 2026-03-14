import type { Request, Response } from "express"
import * as messageService from "./messageService.js"

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { boardId, userId, content } = req.body

    const message = await messageService.createMessage({
      boardId,
      userId,
      content
    })
   
    res.status(201).json(message)

  } catch (error) {
    res.status(500).json({ message: "Failed to send message" })
  }
}

export const getBoardMessages = async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params

    if (!boardId) return res.status(400).json({ message: "Board ID is required" })

    const messages = await messageService.getMessagesByBoard(boardId as string)

    res.json(messages)

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" })
  }
}

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) return res.status(400).json({ message: "Message ID is required" })

    await messageService.deleteMessage(id as string)

    res.json({ message: "Message deleted" })

  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" })
  }
}