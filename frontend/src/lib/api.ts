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

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Signup failed");
  }

  return json;
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


export async function forgotPassword(email: string) {
  const res = await fetch(`${apiUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Request failed");
  }

  return json;
}

export async function resetPassword(token: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Reset failed");
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

export type BoardWithMembers = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  currentSnapshotVersion: number | null;
  createdAt: string;
  updatedAt: string;
  members: {
    id: string;
    userId: string;
    boardId: string;
    role: "ADMIN" | "EDITOR" | "VIEWER";
    isStarred: boolean;
  }[];
};

export type GetBoardsParams = {
  filter?: "all" | "starred" | "shared" | "recent";
  search?: string;
  sort?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
  skip?: number;
  take?: number;
};

export type GetBoardsResult = {
  boards: BoardWithMembers[];
  total: number;
};

export async function getBoards(params?: GetBoardsParams): Promise<GetBoardsResult> {
  const searchParams = new URLSearchParams();
  if (params?.filter) searchParams.set("filter", params.filter);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.order) searchParams.set("order", params.order);
  if (params?.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params?.take !== undefined) searchParams.set("take", String(params.take));

  const query = searchParams.toString();
  const res = await fetch(`${apiUrl}/boards/user${query ? `?${query}` : ""}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load boards");
  }

  return res.json();
}

export async function toggleStarBoard(boardId: string): Promise<{ isStarred: boolean }> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/star`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to toggle star");
  }

  return json;
}

export type BoardSettings = {
  boardId: string;
  isPublic: boolean;
  password: string | null;
};

export async function getBoardSettings(boardId: string): Promise<BoardSettings> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/settings`, {
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load settings");
  }

  return json;
}

export async function updateBoardSettings(
  boardId: string, 
  data: { isPublic?: boolean; password?: string | null }
): Promise<BoardSettings> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to update settings");
  }

  return json;
}

export async function updateBoardMemberRole(
  boardId: string, 
  userId: string, 
  role: "ADMIN" | "EDITOR" | "VIEWER"
): Promise<{ message: string; member: BoardMemberWithUser }> {
  const res = await fetch(`${apiUrl}/boards/${boardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, role }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to update member role");
  }

  return json;
}

export async function deleteBoard(boardId: string): Promise<{ message: string }> {
  const res = await fetch(`${apiUrl}/boards/${boardId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to delete board");
  }

  return json;
}

// ── Comments ──

export type BoardComment = {
  id: string;
  boardId: string;
  shapeId: string;
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

export async function getShapeComments(shapeId: string): Promise<BoardComment[]> {
  const res = await fetch(`${apiUrl}/comments/shape/${shapeId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load comments");
  }

  return res.json();
}

export async function getBoardComments(boardId: string): Promise<BoardComment[]> {
  const res = await fetch(`${apiUrl}/comments/board/${boardId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load comments");
  }

  return res.json();
}

export async function createComment(
  boardId: string,
  shapeId: string,
  content: string
): Promise<BoardComment> {
  const res = await fetch(`${apiUrl}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ boardId, shapeId, content }),
  });

  if (!res.ok) {
    throw new Error("Failed to create comment");
  }

  const data = await res.json();
  return data.data;
}

export async function getCommentCountsByBoard(boardId: string): Promise<Record<string, number>> {
  const res = await fetch(`${apiUrl}/comments/board/${boardId}/counts`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load comment counts");
  }

  return res.json();
}

export async function deleteComment(
  commentId: string,
  boardId: string,
  shapeId: string
): Promise<void> {
  const res = await fetch(
    `${apiUrl}/comments/${commentId}?boardId=${encodeURIComponent(boardId)}&shapeId=${encodeURIComponent(shapeId)}`,
    { method: "DELETE", credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to delete comment");
  }
}

// ── Snapshots ──

export type BoardSnapshot = {
  id: string;
  version: number;
  createdAt: string;
};

export type BoardSnapshotFull = BoardSnapshot & {
  data: { shapes: Record<string, unknown>[] };
};

export async function getBoardSnapshots(boardId: string): Promise<BoardSnapshot[]> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/snapshots`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load snapshots");
  return res.json();
}

export async function getBoardSnapshotById(boardId: string, snapshotId: string): Promise<BoardSnapshotFull> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/snapshots/${snapshotId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load snapshot");
  return res.json();
}

export async function restoreBoardSnapshot(boardId: string, snapshotId: string): Promise<{ message: string }> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/snapshots/${snapshotId}/restore`, {
    method: "POST",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to restore snapshot");
  return json;
}

// ── Activity / Audit Logs ──

export type BoardActivity = {
  id: string;
  boardId: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
};

export async function getBoardActivity(boardId: string): Promise<BoardActivity[]> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/logs`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load activity");
  }

  return res.json();
}

export async function removeBoardMember(boardId: string, userId: string): Promise<{ message: string }> {
  const res = await fetch(`${apiUrl}/boards/${boardId}/member/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Failed to remove member");
  }

  return json;
}

// ── Notifications ──

export type BoardNotification = {
  id: string;
  userId: string;
  boardId: string | null;
  type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  board?: { id: string; title: string } | null;
};

export async function getNotifications(): Promise<BoardNotification[]> {
  const res = await fetch(`${apiUrl}/notifications`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch(`${apiUrl}/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark all as read");
}