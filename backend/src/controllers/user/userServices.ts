import { prisma } from "@/lib/prisma.js";

export async function createUser(data: { email: string; name?: string; passwordHash?: string }) {
  return await prisma.user.create({
    data: {
      email: data.email, 
      name: data.name ?? null, 
      password: data.passwordHash ?? null,
    },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      boards:true
    },
  });
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function updateUser(id: string, data: { name?: string; email?: string }) {
  return await prisma.user.update({
    where: { id },
    data,
  });
}


export async function deleteUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  });
}


export async function getUserBoardRole(userId: string, boardId: string) {
  const membership = await prisma.boardMember.findUnique({
    where: {
      userId_boardId: {
        userId,
        boardId,
      },
    },
    select: {
      role: true,
    },
  });
  
  return membership?.role || null;
}