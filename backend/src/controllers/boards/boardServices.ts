import { prisma } from "@/lib/prisma.js";

export async function createBoard(data: { title: string; userId: string; thumbnailUrl?: string }) {
 
  return await prisma.board.create({
    data: {
      title: data.title,
      thumbnailUrl: data.thumbnailUrl ?? null,
      currentSnapshotVersion: null,
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

const toShapeType = (value: unknown): "RECTANGLE" | "CIRCLE" | "LINE" | "ARROW" | "TEXT" | "DRAW" | "IMAGE" => {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";

  if (normalized === "rectangle") return "RECTANGLE";
  if (normalized === "circle") return "CIRCLE";
  if (normalized === "line") return "LINE";
  if (normalized === "arrow") return "ARROW";
  if (normalized === "text") return "TEXT";
  if (normalized === "image") return "IMAGE";
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

  return await prisma.$transaction(async (tx) => {
    const snapshot = await tx.snapshot.create({
      data: {
        boardId,
        version: nextVersion,
        data: data as any,
      },
    });

    await tx.board.update({
      where: { id: boardId },
      data: { currentSnapshotVersion: nextVersion },
    });

    return snapshot;
  });
}

export async function getBoardCurrentSnapshotVersion(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { currentSnapshotVersion: true },
  });

  return board?.currentSnapshotVersion ?? null;
}

export async function setBoardCurrentSnapshotVersion(boardId: string, version: number | null) {
  return await prisma.board.update({
    where: { id: boardId },
    data: { currentSnapshotVersion: version },
  });
}

export async function getBoardSnapshotByVersion(boardId: string, version: number) {
  return await prisma.snapshot.findUnique({
    where: { boardId_version: { boardId, version } },
  });
}

export async function getSnapshotBeforeVersion(boardId: string, version: number) {
  return await prisma.snapshot.findFirst({
    where: { boardId, version: { lt: version } },
    orderBy: { version: "desc" },
  });
}

export async function getSnapshotAfterVersion(boardId: string, version: number) {
  return await prisma.snapshot.findFirst({
    where: { boardId, version: { gt: version } },
    orderBy: { version: "asc" },
  });
}

// ── Board Object CRUD ──

export async function createBoardObject(
  boardId: string,
  userId: string,
  payload: { type: string; data: Record<string, unknown> }
) {
  return await prisma.shape.create({
    data: {
      boardId,
      userId,
      type: toShapeType(payload.type),
      data: payload.data as any,
    },
  });
}

export async function getBoardObject(objectId: string) {
  return await prisma.shape.findUnique({
    where: { id: objectId },
  });
}

export async function updateBoardObject(
  objectId: string,
  payload: { type?: string; data?: Record<string, unknown> }
) {
  const updateData: Record<string, unknown> = {};
  if (payload.type !== undefined) updateData.type = toShapeType(payload.type);
  if (payload.data !== undefined) updateData.data = payload.data as any;

  return await prisma.shape.update({
    where: { id: objectId },
    data: updateData,
  });
}

export async function deleteBoardObject(objectId: string) {
  return await prisma.shape.delete({
    where: { id: objectId },
  });
}

export async function getBoardSnapshots(boardId: string, limit = 20) {
  return await prisma.snapshot.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      version: true,
      createdAt: true,
    },
  });
}

export async function getBoardSnapshotById(snapshotId: string) {
  return await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });
}