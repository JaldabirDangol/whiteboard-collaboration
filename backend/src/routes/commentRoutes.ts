import express, { Router } from "express"
import {
  createComment,
  deleteComment,
  getCommentsByShape,
  getCommentsByBoard,
  getCommentCountsByBoard,
} from "@/controllers/comment/commentController.js"

const commentRoutes: Router = express.Router()

commentRoutes.get("/board/:boardId", getCommentsByBoard)
commentRoutes.get("/board/:boardId/counts", getCommentCountsByBoard)
commentRoutes.get("/shape/:shapeId", getCommentsByShape)
commentRoutes.post("/", createComment)
commentRoutes.delete("/:id", deleteComment)

export default commentRoutes
