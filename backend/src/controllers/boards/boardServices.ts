import { prisma } from "@/lib/prisma.js";

export async function createBoard(data: { title: string; userId: string; thumbnailUrl?: string }) {
 
  return await prisma.board.create({
    data: {
      title: data.title,
      thumbnailUrl: data.thumbnailUrl ?? null,
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
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function getBoardMember(boardId: string, userId: string) {
  return await prisma.boardMember.findUnique({
    where: {
      userId_boardId: {
        userId,
        boardId,
      },
    },
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

export async function joinBoard(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, title: true },
  });

  if (!board) {
    throw new Error("Board not found");
  }

  const member = await prisma.boardMember.upsert({
    where: {
      userId_boardId: {
        userId,
        boardId,
      },
    },
    update: {},
    create: {
      userId,
      boardId,
      role: "VIEWER",
    },
  });

  return { board, member };
}

export async function shareBoardWithEmail(
  boardId: string,
  ownerUserId: string,
  email: string,
  role: "EDITOR" | "VIEWER"
) {
  const membership = await getBoardMember(boardId, ownerUserId);
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Only board admins can share this board");
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) {
    throw new Error("User with this email does not exist");
  }

  const member = await prisma.boardMember.upsert({
    where: {
      userId_boardId: {
        userId: targetUser.id,
        boardId,
      },
    },
    update: {
      role,
    },
    create: {
      userId: targetUser.id,
      boardId,
      role,
    },
  });

  return {
    member,
    user: targetUser,
  };
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

const toShapeType = (value: unknown): "RECTANGLE" | "CIRCLE" | "LINE" | "DRAW" => {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";

  if (normalized === "rectangle") return "RECTANGLE";
  if (normalized === "circle") return "CIRCLE";
  if (normalized === "line") return "LINE";
  return "DRAW";
};

export async function getBoardShapesFromDatabase(boardId: string) {
  const shapes = await prisma.shape.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });

  return shapes
    .map((shape) => shape.data)
    .filter((data) => typeof data === "object" && data !== null) as Record<string, unknown>[];
}

export async function replaceBoardShapes(
  boardId: string,
  userId: string,
  shapes: Record<string, unknown>[]
) {
  const rows = shapes
    .filter((shape) => typeof shape === "object" && shape !== null)
    .map((shape) => ({
      boardId,
      userId,
      type: toShapeType(shape.type),
      data: shape as any,
    }));

  await prisma.$transaction(async (tx) => {
    await tx.shape.deleteMany({
      where: { boardId },
    });

    if (rows.length > 0) {
      await tx.shape.createMany({
        data: rows,
      });
    }
  });

  return rows.length;
}

export async function getLatestBoardSnapshot(boardId: string) {
  return await prisma.snapshot.findFirst({
    where: { boardId },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function saveBoardSnapshot(boardId: string, data: unknown) {
  const latest = await getLatestBoardSnapshot(boardId);
  const nextVersion = latest ? latest.version + 1 : 1;

  return await prisma.snapshot.create({
    data: {
      boardId,
      version: nextVersion,
      data: data as any,
    },
  });
}