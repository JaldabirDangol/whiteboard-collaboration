import { prisma } from "@/lib/prisma.js"

export const createMessage = async (data: {
  boardId: string
  userId: string
  content: string
}) => {
  return prisma.message.create({
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

export const getMessagesByBoard = async (boardId: string, skip?: number, take?: number) => {
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" },
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
    prisma.message.count({ where: { boardId } }),
  ]);
  return { messages, total };
}

export const getMessageById = async (id: string) => {
  return prisma.message.findUnique({
    where: { id }
  })
}

export const deleteMessage = async (id: string, userId: string) => {
  const message = await getMessageById(id)
  if (!message || message.userId !== userId) {
    return null
  }
  await prisma.message.delete({ where: { id } })
  return true
}