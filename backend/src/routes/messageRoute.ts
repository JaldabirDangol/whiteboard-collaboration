import express, { Router } from "express"
import {
  sendMessage,
  deleteMessage
} from "@/controllers/message/messageController.js"

const messageRoutes:Router = express.Router()

messageRoutes.post("/", sendMessage)
messageRoutes.delete("/:id", deleteMessage)

export default messageRoutes