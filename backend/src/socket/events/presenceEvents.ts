import { Server, Socket } from "socket.io"
import { canAccessBoard, getSocketUserId } from "@/socket/boardAccess.js"

const boardOnlineUsers = new Map<string, Map<string, number>>()

const getOnlineUserIds = (boardId: string) => {
  const boardUsers = boardOnlineUsers.get(boardId)
  if (!boardUsers) return []

  return Array.from(boardUsers.entries())
    .filter(([, count]) => count > 0)
    .map(([userId]) => userId)
}

const trackOnline = (boardId: string, userId: string) => {
  const boardUsers = boardOnlineUsers.get(boardId) ?? new Map<string, number>()
  const current = boardUsers.get(userId) ?? 0
  boardUsers.set(userId, current + 1)
  boardOnlineUsers.set(boardId, boardUsers)
}

const untrackOnline = (boardId: string, userId: string) => {
  const boardUsers = boardOnlineUsers.get(boardId)
  if (!boardUsers) return

  const current = boardUsers.get(userId) ?? 0
  if (current <= 1) {
    boardUsers.delete(userId)
  } else {
    boardUsers.set(userId, current - 1)
  }

  if (boardUsers.size === 0) {
    boardOnlineUsers.delete(boardId)
  }
}

export const registerPresenceEvents = (io: Server, socket: Socket) => {
  let activeBoardId: string | null = null

  socket.on("presence:join", async ({ boardId }: { boardId: string }) => {
    const canJoin = await canAccessBoard(socket, boardId)
    if (!canJoin) {
      socket.emit("presence:error", {
        boardId,
        message: "You do not have access to this board",
      })
      return
    }

    const userId = getSocketUserId(socket) ?? socket.id

    if (activeBoardId && activeBoardId !== boardId) {
      socket.leave(activeBoardId)
      untrackOnline(activeBoardId, userId)
      socket.to(activeBoardId).emit("presence:userOffline", {
        userId,
        status: "offline",
      })
    }

    activeBoardId = boardId
    socket.join(boardId)
    trackOnline(boardId, userId)

    socket.emit("presence:state", {
      boardId,
      userIds: getOnlineUserIds(boardId),
    })

    socket.to(boardId).emit("presence:userOnline", {
      userId,
      status: "online",
    })
  })

  socket.on("presence:leave", ({ boardId }: { boardId: string }) => {
    const userId = getSocketUserId(socket) ?? socket.id
    socket.leave(boardId)
    untrackOnline(boardId, userId)

    if (activeBoardId === boardId) {
      activeBoardId = null
    }

    socket.to(boardId).emit("presence:userOffline", {
      userId,
      status: "offline",
    })
  })

  // Cursor movement
  socket.on("presence:cursorMove", async ({ boardId, position }: { boardId: string; position: { x: number; y: number } }) => {
    const canSharePresence = await canAccessBoard(socket, boardId)
    if (!canSharePresence) return

    socket.to(boardId).emit("presence:cursorMove", {
      userId: getSocketUserId(socket) ?? socket.id,
      position,
    })
  })

  socket.on("disconnect", () => {
    if (!activeBoardId) return

    const userId = getSocketUserId(socket) ?? socket.id
    untrackOnline(activeBoardId, userId)

    socket.to(activeBoardId).emit("presence:userOffline", {
      userId,
      status: "offline",
    })
  })
}