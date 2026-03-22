import express, { Router } from "express"
import {
  sendMessage,
  deleteMessage,
  getMessagesByBoard,
} from "@/controllers/message/messageController.js"

const messageRoutes:Router = express.Router()

messageRoutes.get("/board/:boardId", getMessagesByBoard)
messageRoutes.post("/", sendMessage)
messageRoutes.delete("/:id", deleteMessage)

export default messageRoutes