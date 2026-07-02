import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  board: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  boardMember: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  notification: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  snapshot: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  shape: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((cb: any) => cb(mockPrisma)),
  $executeRawUnsafe: vi.fn(),
};

vi.mock("@/lib/prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auditLog.js", () => ({ logAction: vi.fn() }));
vi.mock("@/controllers/notifications/notificationController.js", () => ({
  createNotification: vi.fn(() => Promise.resolve({ id: "notif-1" })),
}));
vi.mock("@/socket/index.js", () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }), emit: vi.fn() }),
}));
vi.mock("@/socket/yjs.js", () => ({ destroyYDoc: vi.fn() }));

const DEFAULT_USER = { id: "user-1", email: "a@b.com" };
const makeReq = (body: any = {}, params: any = {}, query: any = {}, user: any = DEFAULT_USER) =>
  ({ body, params, query, user } as any);

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as any;
};

describe("Board System - Create Board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.board.findFirst.mockResolvedValue(null);
    mockPrisma.board.create.mockResolvedValue({
      id: "board-1",
      title: "Test Board",
      creatorId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("creates a board with valid title", async () => {
    const { createBoard } = await import("@/controllers/boards/boardController.js");
    const req = makeReq({ title: "Test Board" }, {}, {}, { id: "user-1", email: "a@b.com" });
    const res = makeRes();

    await createBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: "Test Board" }));
  });

  it("rejects missing title", async () => {
    const { createBoard } = await import("@/controllers/boards/boardController.js");
    const req = makeReq({}, {}, {}, { id: "user-1", email: "a@b.com" });
    const res = makeRes();

    await createBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects duplicate title", async () => {
    mockPrisma.board.findFirst.mockResolvedValue({ id: "existing", title: "Test Board" });
    const { createBoard } = await import("@/controllers/boards/boardController.js");
    const req = makeReq({ title: "Test Board" }, {}, {}, { id: "user-1", email: "a@b.com" });
    const res = makeRes();

    await createBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Board with this title already exists" }));
  });

  it("requires authenticated user", async () => {
    const { createBoard } = await import("@/controllers/boards/boardController.js");
    const req = makeReq({ title: "Test" });
    req.user = undefined;
    const res = makeRes();
    await createBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("Board System - Get Board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns board for valid member", async () => {
    const { getBoard: getBoardCtrl } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.board.findUnique.mockResolvedValue({
      id: "board-1", title: "My Board", creatorId: "user-1",
      members: [{ id: "m1", userId: "user-1", role: "ADMIN", user: { id: "user-1", email: "a@b.com", name: null } }],
    });

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await getBoardCtrl(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "board-1", title: "My Board" }));
  });

  it("rejects non-member", async () => {
    const { getBoard: getBoardCtrl } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue(null);

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await getBoardCtrl(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("Board System - RBAC Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("checkBoardAccess allows VIEWER for read operations", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "VIEWER" });

    const middleware = checkBoardAccess("VIEWER");
    const req = makeReq({}, { id: "board-1" }, {}, { id: "user-1", email: "a@b.com" });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("checkBoardAccess blocks VIEWER from editor operations", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "VIEWER" });

    const middleware = checkBoardAccess("EDITOR");
    const req = makeReq({}, { id: "board-1" });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("checkBoardAccess blocks EDITOR from admin operations", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "EDITOR" });

    const middleware = checkBoardAccess("ADMIN");
    const req = makeReq({}, { id: "board-1" });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("checkBoardAccess allows ADMIN for admin operations", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });

    const middleware = checkBoardAccess("ADMIN");
    const req = makeReq({}, { id: "board-1" });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects unauthenticated access", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    const middleware = checkBoardAccess("VIEWER");
    const req = makeReq({}, { id: "board-1" });
    req.user = undefined;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;

    await middleware(req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(401);
  });

  it("rejects non-member access", async () => {
    const { checkBoardAccess } = await import("@/middleware/checkBoardAccess.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue(null);

    const middleware = checkBoardAccess("VIEWER");
    const req = makeReq({}, { id: "board-1" });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;

    await middleware(req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe("Board System - Share & Invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shares board with valid email as VIEWER", async () => {
    const { shareBoard } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-2", email: "other@example.com", name: "Other" });
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", title: "Shared Board" });

    const req = makeReq({ email: "other@example.com", role: "VIEWER" }, { id: "board-1" });
    const res = makeRes();
    await shareBoard(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invitation sent successfully" }));
  });

  it("rejects share for non-admin", async () => {
    const { shareBoard } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "VIEWER" });

    const req = makeReq({ email: "other@example.com" }, { id: "board-1" });
    const res = makeRes();
    await shareBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects share for non-existent user", async () => {
    const { shareBoard } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = makeReq({ email: "missing@example.com" }, { id: "board-1" });
    const res = makeRes();
    await shareBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects share with missing email", async () => {
    const { shareBoard } = await import("@/controllers/boards/boardController.js");
    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await shareBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("Board System - Delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows ADMIN to delete board", async () => {
    const { deleteBoard } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", title: "To Delete" });

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await deleteBoard(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Board deleted successfully" }));
  });

  it("rejects delete for non-admin", async () => {
    const { deleteBoard } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue({ id: "m1", userId: "user-1", boardId: "board-1", role: "EDITOR" });

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await deleteBoard(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("Board System - Star/Unstar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles star for board member", async () => {
    const { toggleStar } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "EDITOR", isStarred: false });
    mockPrisma.boardMember.update.mockResolvedValue({ id: "m1", isStarred: true });

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await toggleStar(req, res);
    expect(res.json).toHaveBeenCalledWith({ isStarred: true });
  });

  it("rejects star for non-member", async () => {
    const { toggleStar } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValue(null);

    const req = makeReq({}, { id: "board-1" });
    const res = makeRes();
    await toggleStar(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("Board System - Member Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows ADMIN to update member role", async () => {
    const { updateBoardMember } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });
    mockPrisma.boardMember.upsert.mockResolvedValue({ id: "m2", userId: "user-2", role: "EDITOR" });

    const req = makeReq({ userId: "user-2", role: "EDITOR" }, { id: "board-1" });
    const res = makeRes();
    await updateBoardMember(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Member updated successfully" }));
  });

  it("rejects role update for non-admin", async () => {
    const { updateBoardMember } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "VIEWER" });

    const req = makeReq({ userId: "user-2", role: "EDITOR" }, { id: "board-1" });
    const res = makeRes();
    await updateBoardMember(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("validates role enum", async () => {
    const { updateBoardMember } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });

    const req = makeReq({ userId: "user-2", role: "INVALID" }, { id: "board-1" });
    const res = makeRes();
    await updateBoardMember(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("allows ADMIN to remove member", async () => {
    const { removeMember } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });

    const req = makeReq({}, { id: "board-1", userId: "user-2" });
    const res = makeRes();
    await removeMember(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Member removed successfully" }));
  });

  it("prevents self-removal", async () => {
    const { removeMember } = await import("@/controllers/boards/boardController.js");
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ id: "m1", userId: "user-1", boardId: "board-1", role: "ADMIN" });

    const req = makeReq({}, { id: "board-1", userId: "user-1" });
    const res = makeRes();
    await removeMember(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("Board System - Snapshot Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves snapshot with auto-incrementing version", async () => {
    const { saveBoardSnapshot } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        snapshot: {
          findFirst: vi.fn().mockResolvedValue({ version: 3 }),
          create: vi.fn().mockResolvedValue({ id: "snap-4", boardId: "board-1", version: 4, data: {} }),
        },
        board: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });

    const result = await saveBoardSnapshot("board-1", { shapes: [{ id: "s1", type: "rect" }] });
    expect(result.version).toBe(4);
  });

  it("creates first snapshot at version 1", async () => {
    const { saveBoardSnapshot } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        snapshot: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "snap-1", boardId: "board-1", version: 1, data: {} }),
        },
        board: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });

    const result = await saveBoardSnapshot("board-1", { shapes: [] });
    expect(result.version).toBe(1);
  });
});
