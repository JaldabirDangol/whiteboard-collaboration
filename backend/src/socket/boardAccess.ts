import type { Socket } from "socket.io";
import { getBoardMember } from "@/controllers/boards/boardServices.js";

export type BoardRole = "ADMIN" | "EDITOR" | "VIEWER";

export const getSocketUserId = (socket: Socket) => {
  const user = socket.data.user as { id?: string } | undefined;
  return user?.id;
};

export const getBoardRoleForSocketUser = async (socket: Socket, boardId: string): Promise<BoardRole | null> => {
  const userId = getSocketUserId(socket);
  if (!userId) return null;

  const membership = await getBoardMember(boardId, userId);
  if (!membership) return null;

  return membership.role as BoardRole;
};

export const canAccessBoard = async (socket: Socket, boardId: string) => {
  const role = await getBoardRoleForSocketUser(socket, boardId);
  return role !== null;
};

export const canEditBoard = async (socket: Socket, boardId: string) => {
  const role = await getBoardRoleForSocketUser(socket, boardId);
  return role === "ADMIN" || role === "EDITOR";
};
