import { prisma } from "@/lib/prisma.js";

export async function createBoard(data: { title: string; userId: string }) {
  return await prisma.board.create({
    data: {
      title: data.title,
      members: {
        create: {
          userId: data.userId,
          role: "ADMIN",
        },
      },
    },
  });
}

export async function getBoard(id: string) {
  return await prisma.board.findUnique({
    where: { id },
    include: { members: true },
  });
}

export async function getBoardsForUser(userId: string) {
  return await prisma.board.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: { members: true },
  });
}

export async function updateBoard(id: string, data: { title?: string }) {
  return await prisma.board.update({
    where: { id },
    data,
  });
}

export async function deleteBoard(id: string) {
  return await prisma.board.delete({
    where: { id },
  });
}

export async function updateBoardMember(boardId: string, userId: string, role: "ADMIN" | "EDITOR" | "VIEWER") {
  return await prisma.boardMember.upsert({
    where: {
      userId_boardId: { userId, boardId },
    },
    update: { role },
    create: { userId, boardId, role },
  });
}

export async function removeMember(boardId: string, userId: string) {
  return await prisma.boardMember.delete({
    where: {
      userId_boardId: { userId, boardId },
    },
  });
}

export async function getBoardData(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      shapes: true,
      messages: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!board) return null;

  return {
    shapes: board.shapes,
    messages: board.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      userName: msg.user.name,
      createdAt: msg.createdAt,
    })),
  };
}


export async function getRecentMessages(boardId: string, limit = 20) {  
  return await prisma.message.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function getShapes(boardId: string) {
  return await prisma.shape.findMany({
    where: { boardId },
  });
}