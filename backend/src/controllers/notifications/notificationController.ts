import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma.js";
import { getIO } from "@/socket/index.js";

export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        board: {
          select: { id: true, title: true },
        },
      },
    });

    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return res.json({ message: "Marked as read" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  boardId?: string,
  metadata?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, boardId: boardId ?? null, metadata: metadata ?? undefined },
    include: {
      board: { select: { id: true, title: true } },
    },
  });

  const io = getIO();
  io.to(`user:${userId}`).emit("notification:new", notification);

  return notification;
}
