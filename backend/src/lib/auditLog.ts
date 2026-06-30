import { prisma } from "@/lib/prisma.js";
import { getIO } from "@/socket/index.js";

export async function logAction(data: {
  boardId: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const log = await prisma.auditLog.create({
    data: {
      boardId: data.boardId,
      userId: data.userId,
      action: data.action,
      metadata: data.metadata as any ?? undefined,
    },
  });

  try {
    getIO().to(data.boardId).emit("board:activity", {
      id: log.id,
      boardId: log.boardId,
      userId: log.userId,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt,
    });
  } catch {
    // IO not initialized yet
  }

  return log;
}

export async function getLogsForBoard(boardId: string, skip?: number, take = 50) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where: { boardId } }),
  ]);
  return { logs, total };
}

export async function getLogsForBoardWithUsers(boardId: string, skip?: number, take = 50) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where: { boardId } }),
  ]);
  return { logs, total };
}
