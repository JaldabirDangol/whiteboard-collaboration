import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  comment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn().mockImplementation((args: any) => Promise.resolve({
      ...args.data,
      id: "c1",
      createdAt: new Date(),
      updatedAt: new Date(),
      shape: { data: { id: args.data?.shapeId } },
    })),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  shape: {
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  boardMember: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  notification: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

vi.mock("@/lib/prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("@/socket/index.js", () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }) }),
}));

const makeReq = (body = {}, params = {}, query = {}, user = { id: "user-1", email: "a@b.com" }) =>
  ({ body, params, query, user } as any);

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as any;
};

describe("Comment System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a comment on a shape", async () => {
    const { createComment } = await import("@/controllers/comment/commentController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "EDITOR" });
    mockPrisma.shape.findUnique.mockResolvedValue({ id: "shape-1", boardId: "board-1" });
    mockPrisma.comment.create.mockResolvedValue({
      id: "c1", boardId: "board-1", shapeId: "shape-1", userId: "user-1",
      content: "Great work!", createdAt: new Date(), updatedAt: new Date(),
      user: { id: "user-1", name: "Test", email: "a@b.com" },
      shape: { data: { id: "shape-1" } },
    });

    const req = makeReq({ boardId: "board-1", shapeId: "shape-1", content: "Great work!" });
    const res = makeRes();
    await createComment(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects empty comment content", async () => {
    const { createComment } = await import("@/controllers/comment/commentController.js");
    const req = makeReq({ boardId: "board-1", shapeId: "shape-1", content: "" });
    const res = makeRes();
    await createComment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects comment exceeding 5000 character limit", async () => {
    const { createComment } = await import("@/controllers/comment/commentController.js");
    const req = makeReq({ boardId: "board-1", shapeId: "shape-1", content: "x".repeat(5001) });
    const res = makeRes();
    await createComment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deletes a comment", async () => {
    const { deleteComment } = await import("@/controllers/comment/commentController.js");
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: "c1", boardId: "board-1", shapeId: "shape-1", userId: "user-1", content: "test",
    });

    const req = makeReq({}, { id: "c1" }, { boardId: "board-1" });
    const res = makeRes();
    await deleteComment(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it("gets comments by board", async () => {
    const { getCommentsByBoard } = await import("@/controllers/comment/commentController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "VIEWER" });
    mockPrisma.comment.findMany.mockResolvedValue([
      { id: "c1", boardId: "board-1", shapeId: "shape-1", content: "Nice",
        user: { id: "user-1", name: "Test" }, shape: { data: { id: "shape-1" } } },
    ]);
    mockPrisma.comment.count.mockResolvedValue(1);

    const req = makeReq({}, { boardId: "board-1" });
    const res = makeRes();
    await getCommentsByBoard(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 1 })
    );
  });

  it("gets comment counts by board", async () => {
    const { getCommentCountsByBoard } = await import("@/controllers/comment/commentController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "VIEWER" });
    mockPrisma.comment.groupBy.mockResolvedValue([
      { shapeId: "s1", _count: { shapeId: 2 } },
      { shapeId: "s2", _count: { shapeId: 1 } },
    ]);

    const req = makeReq({}, { boardId: "board-1" });
    const res = makeRes();
    await getCommentCountsByBoard(req, res);
    expect(res.json).toHaveBeenCalledWith({ s1: 2, s2: 1 });
  });

  it("returns empty counts for board with no comments", async () => {
    const { getCommentCountsByBoard } = await import("@/controllers/comment/commentController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "VIEWER" });
    mockPrisma.comment.groupBy.mockResolvedValue([]);

    const req = makeReq({}, { boardId: "board-1" });
    const res = makeRes();
    await getCommentCountsByBoard(req, res);
    expect(res.json).toHaveBeenCalledWith({});
  });
});

describe("Message System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a message to a board", async () => {
    const { sendMessage } = await import("@/controllers/message/messageController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "EDITOR" });
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-1", boardId: "board-1", userId: "user-1", content: "Hello!", createdAt: new Date(),
    });

    const req = makeReq({ boardId: "board-1", content: "Hello!" });
    const res = makeRes();
    await sendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects empty message", async () => {
    const { sendMessage } = await import("@/controllers/message/messageController.js");
    const req = makeReq({ boardId: "board-1", content: "" });
    const res = makeRes();
    await sendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deletes own message", async () => {
    const { deleteMessage } = await import("@/controllers/message/messageController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "bm1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.message.findUnique.mockResolvedValue({
      id: "msg-1", boardId: "board-1", userId: "user-1", content: "test",
    });

    const req = makeReq({}, { id: "msg-1" }, { boardId: "board-1" });
    const res = makeRes();
    await deleteMessage(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe("Notification System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts invitation", async () => {
    const { acceptInvitation } = await import("@/controllers/boards/boardController.js");
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: "notif-1", userId: "user-1", boardId: "board-1",
      type: "share_invite",
      metadata: { status: "pending", role: "EDITOR", sharedBy: "user-2" },
    });
    mockPrisma.boardMember.create.mockResolvedValue({ id: "bm-1", userId: "user-1", boardId: "board-1", role: "EDITOR" });

    const req = makeReq({}, { id: "notif-1" });
    const res = makeRes();
    await acceptInvitation(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invitation accepted" }));
  });

  it("declines invitation", async () => {
    const { declineInvitation } = await import("@/controllers/boards/boardController.js");
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: "notif-1", userId: "user-1", boardId: "board-1",
      type: "share_invite",
      metadata: { status: "pending", role: "EDITOR", sharedBy: "user-2" },
    });
    mockPrisma.notification.update.mockResolvedValue({});

    const req = makeReq({}, { id: "notif-1" });
    const res = makeRes();
    await declineInvitation(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invitation declined" }));
  });

  it("rejects non-pending invitation", async () => {
    const { acceptInvitation } = await import("@/controllers/boards/boardController.js");
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: "notif-1", userId: "user-1", type: "share_invite",
      metadata: { status: "accepted" },
    });

    const req = makeReq({}, { id: "notif-1" });
    const res = makeRes();
    await acceptInvitation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects notification for wrong user", async () => {
    const { acceptInvitation } = await import("@/controllers/boards/boardController.js");
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: "notif-1", userId: "other-user", type: "share_invite",
      metadata: { status: "pending" },
    });

    const req = makeReq({}, { id: "notif-1" });
    const res = makeRes();
    await acceptInvitation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
