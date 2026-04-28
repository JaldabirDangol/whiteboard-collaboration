import { Server, Socket } from "socket.io";
import { canAccessBoard, getSocketUserId } from "@/socket/boardAccess.js";
import { createMessage, deleteMessage } from "@/controllers/message/messageService.js";

export const registerChatEvents = (io: Server, socket: Socket) => {
  socket.on("chat:send", async (payload: {
    boardId: string;
    message: string;
  }) => {
    const { boardId, message } = payload;
    const userId = getSocketUserId(socket);
    if (!userId) return;

    const hasAccess = await canAccessBoard(socket, boardId);
    if (!hasAccess) {
      socket.emit("chat:error", { message: "You do not have access to this board" });
      return;
    }

    if (!message || message.trim().length === 0) {
      socket.emit("chat:error", { message: "Message content cannot be empty" });
      return;
    }

    try {
      const created = await createMessage({
        boardId,
        userId,
        content: message.trim(),
      });

      // Emit with the event names the frontend actually listens on
      io.to(boardId).emit("messageSent", created);
    } catch (error) {
      console.error("[chat:send]", error);
      socket.emit("chat:error", { message: "Failed to send message" });
    }
  });

  socket.on("chat:delete", async (payload: {
    boardId: string;
    messageId: string;
  }) => {
    const { boardId, messageId } = payload;
    const userId = getSocketUserId(socket);
    if (!userId) return;

    const hasAccess = await canAccessBoard(socket, boardId);
    if (!hasAccess) {
      socket.emit("chat:error", { message: "You do not have access to this board" });
      return;
    }

    try {
      const deleted = await deleteMessage(messageId, userId);
      if (!deleted) {
        socket.emit("chat:error", { message: "Message not found or unauthorized" });
        return;
      }

      // Emit with the event name the frontend actually listens on
      io.to(boardId).emit("messageDeleted", messageId);
    } catch (error) {
      console.error("[chat:delete]", error);
      socket.emit("chat:error", { message: "Failed to delete message" });
    }
  });
};
