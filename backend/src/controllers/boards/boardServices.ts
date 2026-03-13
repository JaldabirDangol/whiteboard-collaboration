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