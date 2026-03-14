import express, { Router } from "express"
import {
  sendMessage,
  getBoardMessages,
  deleteMessage
} from "@/controllers/message/messageController.js"

const messageRoutes:Router = express.Router()

messageRoutes.post("/", sendMessage)
messageRoutes.get("/:boardId", getBoardMessages)
messageRoutes.delete("/:id", deleteMessage)

export default messageRoutes