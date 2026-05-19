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

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Login failed");
  }

  return json;
}

export async function logout() {
  const res = await fetch(`${apiUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Logout failed");
  }

  return json;
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

export async function joinBoard(boardId: string) {
  const res = await fetch(`${apiUrl}/boards/${boardId}/join`, {
    method: "POST",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to join board");
  }

  return json;
}

export async function shareBoard(boardId: string, email: string, role: "EDITOR" | "VIEWER") {
  const res = await fetch(`${apiUrl}/boards/${boardId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, role }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to share board");
  }

  return json;
}

export type BoardMemberWithUser = {
  id: string;
  userId: string;
  boardId: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type BoardDetails = {
  id: string;
  title: string;
  members: BoardMemberWithUser[];
};

export async function getBoardDetails(boardId: string): Promise<BoardDetails> {
  const res = await fetch(`${apiUrl}/boards/${boardId}`, {
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load board details");
  }

  return json;
}

export async function getPersistedBoardShapes(boardId: string) {
  const res = await fetch(`${apiUrl}/boards/${boardId}/shapes`, {
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load board shapes");
  }

  return Array.isArray(json?.shapes) ? json.shapes : [];
}

export type BoardAsset = {
  id: string;
  boardId: string;
  url: string;
  type: "IMAGE" | "PDF" | "VIDEO" | "FILE";
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export async function uploadBoardImage(boardId: string, file: File): Promise<BoardAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("boardId", boardId);

  const res = await fetch(`${apiUrl}/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to upload image");
  }

  return json as BoardAsset;
}

export async function getUserByEmail(email: string) {
  const res = await fetch(`${apiUrl}/users/email?email=${encodeURIComponent(email)}`, {
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function updateUser(data: { name?: string }) {
  const res = await fetch(`${apiUrl}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to update profile");
  return json;
}

export async function deleteUser() {
  const res = await fetch(`${apiUrl}/users/me`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to delete account");
  return json;
}