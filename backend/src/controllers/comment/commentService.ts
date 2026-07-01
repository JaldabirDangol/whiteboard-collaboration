import { prisma } from "@/lib/prisma.js"

// Resolve a client-side shape UUID to the actual DB Shape.id.
// For newly-persisted shapes (after fix #2) the client UUID IS the Shape.id.
// For older shapes they differ, so fall back to JSONB lookup via data->>'id'.
const resolveShapeDbId = async (boardId: string, clientShapeId: string): Promise<string | null> => {
  const direct = await prisma.shape.findUnique({
    where: { id: clientShapeId },
    select: { id: true },
  });
  if (direct) return direct.id;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Shape"
    WHERE "boardId" = ${boardId} AND data->>'id' = ${clientShapeId}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
};

export const createComment = async (data: {
  boardId: string
  shapeId: string
  userId: string
  content: string
}) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Resolve client-side shapeId → actual DB Shape.id (they differ when shape was
      // persisted with gen_random_uuid). For newly persisted shapes (fix #2) they match,
      // but old shapes need the lookup via data->>'id'.
      const dbShapeId = await resolveShapeDbId(data.boardId, data.shapeId);
      if (!dbShapeId) {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }
        throw new Error("Shape not found in database");
      }

      const created = await prisma.comment.create({
        data: {
          boardId: data.boardId,
          shapeId: dbShapeId,
          userId: data.userId,
          content: data.content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shape: {
            select: { data: true },
          },
        },
      });

      return {
        ...created,
        clientShapeId: ((created.shape?.data as Record<string, unknown> | null)?.id as string) ?? created.shapeId,
        shape: undefined,
      };
    } catch (err) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === "P2003" && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export const getCommentsByShape = async (shapeId: string) => {
  return prisma.comment.findMany({
    where: { shapeId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

export const getCommentsByBoard = async (boardId: string, skip?: number, take?: number) => {
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
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
        shape: {
          select: { data: true },
        },
      },
    }),
    prisma.comment.count({ where: { boardId } }),
  ]);

  const mapped = comments.map((c) => ({
    ...c,
    clientShapeId: ((c.shape?.data as Record<string, unknown> | null)?.id as string) ?? c.shapeId,
    shape: undefined,
  }));

  return { comments: mapped, total };
}

export const getCommentById = async (id: string) => {
  return prisma.comment.findUnique({
    where: { id },
  })
}

export const getCommentCountsByBoard = async (boardId: string) => {
  const counts = await prisma.comment.groupBy({
    by: ["shapeId"],
    where: { boardId },
    _count: { shapeId: true },
  });

  return Object.fromEntries(
    counts.map((c) => [c.shapeId, c._count.shapeId])
  );
}

export const deleteComment = async (id: string, userId: string) => {
  const comment = await getCommentById(id)
  if (!comment || comment.userId !== userId) {
    return null
  }
  await prisma.comment.delete({ where: { id } })
  return true
}
