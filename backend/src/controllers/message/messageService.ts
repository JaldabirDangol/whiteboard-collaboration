import { prisma } from "@/lib/prisma.js"

export const createMessage = async (data: {
  boardId: string
  userId: string
  content: string
}) => {
  return prisma.message.create({
    data
  })
}

export const getMessagesByBoard = async (boardId: string) => {
  return prisma.message.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" }
  })
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