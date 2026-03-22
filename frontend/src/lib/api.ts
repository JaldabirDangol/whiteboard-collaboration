// src/lib/api.ts
import { apiUrl } from "@/constant";
export async function signup(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Signup failed");
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}


export async function getMe() {
  const res = await fetch(`${apiUrl}/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;

  return res.json();
}

export type BoardMessage = {
  id: string;
  boardId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
};

export async function getBoardMessages(boardId: string): Promise<BoardMessage[]> {
  const res = await fetch(`${apiUrl}/messages/board/${boardId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load messages");
  }

  return res.json();
}

export async function sendBoardMessage(boardId: string, content: string): Promise<BoardMessage> {
  const res = await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ boardId, content }),
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }

  const data = await res.json();
  return data.data;
}

export async function deleteBoardMessage(messageId: string, boardId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/messages/${messageId}?boardId=${encodeURIComponent(boardId)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to delete message");
  }
}