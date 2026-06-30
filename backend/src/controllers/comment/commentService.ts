import { prisma } from "@/lib/prisma.js"

export const createComment = async (data: {
  boardId: string
  shapeId: string
  userId: string
  content: string
}) => {
  return prisma.comment.create({
    data,
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
      },
    }),
    prisma.comment.count({ where: { boardId } }),
  ]);
  return { comments, total };
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
