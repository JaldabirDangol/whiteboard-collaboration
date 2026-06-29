import { Server, Socket } from "socket.io";
import { canAccessBoard, getSocketUserId } from "@/socket/boardAccess.js";
import { createComment, deleteComment } from "@/controllers/comment/commentService.js";

export const registerCommentEvents = (io: Server, socket: Socket) => {
  socket.on("comment:add", async (payload: {
    boardId: string;
    shapeId: string;
    content: string;
  }) => {
    const { boardId, shapeId, content } = payload;
    const userId = getSocketUserId(socket);
    if (!userId) return;

    const hasAccess = await canAccessBoard(socket, boardId);
    if (!hasAccess) {
      socket.emit("comment:error", { message: "You do not have access to this board" });
      return;
    }

    if (!content || content.trim().length === 0) {
      socket.emit("comment:error", { message: "Comment content cannot be empty" });
      return;
    }

    if (!shapeId) {
      socket.emit("comment:error", { message: "Shape ID is required" });
      return;
    }

    try {
      const created = await createComment({
        boardId,
        shapeId,
        userId,
        content: content.trim(),
      });

      io.to(boardId).emit("comment:new", created);
    } catch (error) {
      console.error("[comment:add]", error);
      socket.emit("comment:error", { message: "Failed to add comment" });
    }
  });

  socket.on("comment:delete", async (payload: {
    boardId: string;
    commentId: string;
    shapeId: string;
  }) => {
    const { boardId, commentId, shapeId } = payload;
    const userId = getSocketUserId(socket);
    if (!userId) return;

    const hasAccess = await canAccessBoard(socket, boardId);
    if (!hasAccess) {
      socket.emit("comment:error", { message: "You do not have access to this board" });
      return;
    }

    try {
      const deleted = await deleteComment(commentId, userId);
      if (!deleted) {
        socket.emit("comment:error", { message: "Comment not found or unauthorized" });
        return;
      }

      io.to(boardId).emit("comment:removed", { commentId, shapeId });
    } catch (error) {
      console.error("[comment:delete]", error);
      socket.emit("comment:error", { message: "Failed to delete comment" });
    }
  });
};
