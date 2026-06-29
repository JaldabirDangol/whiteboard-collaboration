import { prisma } from "@/lib/prisma.js";

export async function logAction(data: {
  boardId: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  return await prisma.auditLog.create({
    data: {
      boardId: data.boardId,
      userId: data.userId,
      action: data.action,
      metadata: data.metadata as any ?? undefined,
    },
  });
}

export async function getLogsForBoard(boardId: string, limit = 50) {
  return await prisma.auditLog.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getLogsForBoardWithUsers(boardId: string, limit = 50) {
  return await prisma.auditLog.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
