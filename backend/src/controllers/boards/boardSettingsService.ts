import { prisma } from "@/lib/prisma.js";

export async function getBoardSettings(boardId: string) {
  return await prisma.boardSettings.findUnique({
    where: { boardId },
  });
}

export async function upsertBoardSettings(
  boardId: string,
  data: { isPublic?: boolean; password?: string | null }
) {
  return await prisma.boardSettings.upsert({
    where: { boardId },
    update: data,
    create: {
      boardId,
      ...data,
    },
  });
}
