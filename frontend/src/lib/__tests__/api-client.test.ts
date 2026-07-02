import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the constant for API URL
vi.mock("@/constant", () => ({
  apiUrl: "http://localhost:3050/api",
}));

beforeEach(() => {
  mockFetch.mockReset();
});

const mockJsonResponse = (data: unknown, status = 200) => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
  mockFetch.mockResolvedValue(response);
};

describe("API Client - Auth", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("signup sends email and password", async () => {
    mockJsonResponse({ id: "u1", email: "test@example.com", message: "User created successfully" }, 201);
    const { signup } = await import("@/lib/api");
    const result = await signup("test@example.com", "Secure123!");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "Secure123!" }),
      })
    );
    expect(result).toEqual({ id: "u1", email: "test@example.com", message: "User created successfully" });
  });

  it("login sends credentials and returns user", async () => {
    mockJsonResponse({ id: "u1", email: "test@example.com", message: "Login successful" });
    const { login } = await import("@/lib/api");
    const result = await login("test@example.com", "Secure123!");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "Secure123!" }),
      })
    );
    expect(result.email).toBe("test@example.com");
  });

  it("logout clears session", async () => {
    mockJsonResponse({ message: "Logged out" });
    const { logout } = await import("@/lib/api");
    const result = await logout();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/auth/logout",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.message).toBe("Logged out");
  });

  it("getMe returns null when not authenticated", async () => {
    mockJsonResponse(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });
    const { getMe } = await import("@/lib/api");
    const result = await getMe();
    expect(result).toBeNull();
  });

  it("getMe returns user when authenticated", async () => {
    mockJsonResponse({ id: "u1", email: "test@example.com", name: "Test" });
    const { getMe } = await import("@/lib/api");
    const result = await getMe();
    expect(result).toEqual({ id: "u1", email: "test@example.com", name: "Test" });
  });
});

describe("API Client - Boards", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("getBoards returns boards list", async () => {
    mockJsonResponse({ boards: [{ id: "b1", title: "Board 1" }], total: 1 });
    const { getBoards } = await import("@/lib/api");
    const result = await getBoards({ filter: "all" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/boards/user?filter=all"),
      expect.any(Object)
    );
    expect(result.boards).toHaveLength(1);
  });

  it("getBoardDetails returns board with members", async () => {
    const boardData = {
      id: "b1", title: "My Board",
      members: [{ id: "m1", userId: "u1", role: "ADMIN", user: { id: "u1", email: "a@b.com" } }],
    };
    mockJsonResponse(boardData);
    const { getBoardDetails } = await import("@/lib/api");
    const result = await getBoardDetails("b1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1",
      expect.any(Object)
    );
    expect(result.id).toBe("b1");
  });

  it("joinBoard sends POST request", async () => {
    mockJsonResponse({ message: "Joined board successfully", board: { id: "b1" }, member: { id: "m1" } });
    const { joinBoard } = await import("@/lib/api");
    const result = await joinBoard("b1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1/join",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.message).toBe("Joined board successfully");
  });

  it("shareBoard sends email and role", async () => {
    mockJsonResponse({ message: "Invitation sent successfully" });
    const { shareBoard } = await import("@/lib/api");
    await shareBoard("b1", "other@example.com", "EDITOR");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1/share",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "other@example.com", role: "EDITOR" }),
      })
    );
  });

  it("deleteBoard sends DELETE request", async () => {
    mockJsonResponse({ message: "Board deleted successfully" });
    const { deleteBoard } = await import("@/lib/api");
    await deleteBoard("b1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("toggleStarBoard sends PATCH request", async () => {
    mockJsonResponse({ isStarred: true });
    const { toggleStarBoard } = await import("@/lib/api");
    const result = await toggleStarBoard("b1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1/star",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.isStarred).toBe(true);
  });
});

describe("API Client - Comments & Messages", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("createComment sends content", async () => {
    mockJsonResponse({ data: { id: "c1", content: "Nice!" } });
    const { createComment } = await import("@/lib/api");
    const result = await createComment("b1", "s1", "Nice!");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ boardId: "b1", shapeId: "s1", content: "Nice!" }),
      })
    );
    expect(result.content).toBe("Nice!");
  });

  it("getBoardComments fetches with take param", async () => {
    mockJsonResponse([{ id: "c1", content: "test" }]);
    const { getBoardComments } = await import("@/lib/api");
    await getBoardComments("b1", 200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/comments/board/b1?take=200",
      expect.any(Object)
    );
  });

  it("getCommentCountsByBoard returns shape counts", async () => {
    mockJsonResponse({ s1: 2, s2: 1 });
    const { getCommentCountsByBoard } = await import("@/lib/api");
    const result = await getCommentCountsByBoard("b1");
    expect(result).toEqual({ s1: 2, s2: 1 });
  });

  it("sendBoardMessage sends content", async () => {
    mockJsonResponse({ id: "m1", content: "Hello!" });
    const { sendBoardMessage } = await import("@/lib/api");
    await sendBoardMessage("b1", "Hello!");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ boardId: "b1", content: "Hello!" }),
      })
    );
  });
});

describe("API Client - Snapshots", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("getBoardSnapshots lists snapshot versions", async () => {
    mockJsonResponse([{ id: "snap1", version: 1, createdAt: "2024-01-01" }]);
    const { getBoardSnapshots } = await import("@/lib/api");
    await getBoardSnapshots("b1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1/snapshots",
      expect.any(Object)
    );
  });

  it("restoreBoardSnapshot sends POST", async () => {
    mockJsonResponse({ message: "Snapshot restored" });
    const { restoreBoardSnapshot } = await import("@/lib/api");
    await restoreBoardSnapshot("b1", "snap1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/boards/b1/snapshots/snap1/restore",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("API Client - Notifications", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("getNotifications fetches all notifications", async () => {
    mockJsonResponse([{ id: "n1", type: "share_invite", message: "Invited" }]);
    const { getNotifications } = await import("@/lib/api");
    await getNotifications();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/notifications",
      expect.any(Object)
    );
  });

  it("markNotificationRead sends POST", async () => {
    mockJsonResponse({});
    const { markNotificationRead } = await import("@/lib/api");
    await markNotificationRead("n1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/notifications/n1/read",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("acceptInvitation sends POST", async () => {
    mockJsonResponse({});
    const { acceptInvitation } = await import("@/lib/api");
    await acceptInvitation("n1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3050/api/notifications/n1/accept",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("API Client - Error Handling", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("throws on non-ok response with error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Email already in use" }),
    });
    const { signup } = await import("@/lib/api");
    await expect(signup("dup@example.com", "pass")).rejects.toThrow("Email already in use");
  });

  it("throws generic error when no error message returned", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    const { signup } = await import("@/lib/api");
    await expect(signup("test@example.com", "pass")).rejects.toThrow("Signup failed");
  });

  it("handles network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { signup } = await import("@/lib/api");
    await expect(signup("test@example.com", "pass")).rejects.toThrow("Network error");
  });
});
