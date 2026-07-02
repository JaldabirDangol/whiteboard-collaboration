import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  shape: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  comment: {
    findMany: vi.fn(),
  },
  board: {
    findUnique: vi.fn(),
  },
  boardMember: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

vi.mock("@/lib/prisma.js", () => ({ prisma: mockPrisma }));

describe("Shape System - replaceBoardShapes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts new shapes when none exist in DB", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    mockPrisma.shape.findMany.mockResolvedValue([]);
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", creatorId: "user-1" });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        shape: {
          findMany: vi.fn().mockResolvedValue([]),
          deleteMany: vi.fn(),
        },
        comment: { findMany: vi.fn().mockResolvedValue([]) },
        $executeRawUnsafe: vi.fn(),
      };
      return cb(tx);
    });

    const shapes = [
      { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
      { id: "s2", type: "circle", x: 50, y: 50, r: 30 },
    ];

    const result = await replaceBoardShapes("board-1", "user-1", shapes);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.createdTypes).toEqual(["rectangle", "circle"]);
  });

  it("detects type changes on update", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    const existingShape = {
      id: "db-1",
      type: "RECTANGLE",
      userId: "user-1",
      boardId: "board-1",
      data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.shape.findMany.mockResolvedValue([existingShape]);
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", creatorId: "user-1" });

    const txShapeFindMany = vi.fn().mockResolvedValue([
      { id: "db-1", data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 }, userId: "user-1", type: "RECTANGLE" },
    ]);

    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        shape: {
          findMany: txShapeFindMany,
          deleteMany: vi.fn(),
        },
        comment: { findMany: vi.fn().mockResolvedValue([]) },
        $executeRawUnsafe: vi.fn(),
      };
      return cb(tx);
    });

    // Same data → should skip (no update)
    const result = await replaceBoardShapes("board-1", "user-1", [
      { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
    ]);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0); // unchanged
    expect(result.deleted).toBe(0);
  });

  it("updates shapes with changed data", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    mockPrisma.shape.findMany.mockResolvedValue([
      { id: "db-1", type: "RECTANGLE", userId: "user-1", boardId: "board-1",
        data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
        createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", creatorId: "user-1" });

    const txShapeFindMany = vi.fn().mockResolvedValue([
      { id: "db-1", data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 }, userId: "user-1", type: "RECTANGLE" },
    ]);

    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        shape: { findMany: txShapeFindMany, deleteMany: vi.fn() },
        comment: { findMany: vi.fn().mockResolvedValue([]) },
        $executeRawUnsafe: vi.fn(),
      };
      return cb(tx);
    });

    const result = await replaceBoardShapes("board-1", "user-1", [
      { id: "s1", type: "rectangle", x: 20, y: 20, w: 200, h: 100 }, // changed
    ]);
    expect(result.updated).toBe(1);
  });

  it("deletes shapes not in incoming set", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    mockPrisma.shape.findMany.mockResolvedValue([
      { id: "db-1", type: "RECTANGLE", userId: "user-1", boardId: "board-1",
        data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
        createdAt: new Date(), updatedAt: new Date() },
      { id: "db-2", type: "CIRCLE", userId: "user-1", boardId: "board-1",
        data: { id: "s2", type: "circle", x: 50, y: 50, r: 30 },
        createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.board.findUnique.mockResolvedValue({ id: "board-1", creatorId: "user-1" });

    const commentFindMany = vi.fn().mockResolvedValue([]);
    const txShapeFindMany = vi.fn().mockResolvedValue([
      { id: "db-1", data: { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 }, userId: "user-1", type: "RECTANGLE" },
      { id: "db-2", data: { id: "s2", type: "circle", x: 50, y: 50, r: 30 }, userId: "user-1", type: "CIRCLE" },
    ]);

    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        shape: { findMany: txShapeFindMany, deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
        comment: { findMany: commentFindMany },
        $executeRawUnsafe: vi.fn(),
      };
      return cb(tx);
    });

    // Only s1 in incoming — s2 should be deleted
    const result = await replaceBoardShapes("board-1", "user-1", [
      { id: "s1", type: "rectangle", x: 10, y: 10, w: 100, h: 50 },
    ]);
    expect(result.deleted).toBe(1);
    expect(result.deletedTypes).toEqual(["circle"]);
    expect(result.created).toBe(0);
  });

  it("handles empty incoming shapes by deleting all", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    mockPrisma.shape.count.mockResolvedValue(3);
    mockPrisma.shape.findMany.mockResolvedValue([
      { type: "RECTANGLE" }, { type: "CIRCLE" }, { type: "LINE" },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([]);

    const result = await replaceBoardShapes("board-1", "user-1", []);
    expect(result.deleted).toBe(3);
    expect(result.deletedTypes).toEqual(["rectangle", "circle", "line"]);
  });

  it("detects orphaned comments on shape deletion", async () => {
    const { replaceBoardShapes } = await import("@/controllers/boards/boardServices.js");

    mockPrisma.shape.count.mockResolvedValue(1);
    mockPrisma.shape.findMany.mockResolvedValue([{ type: "RECTANGLE" }]);
    mockPrisma.comment.findMany.mockResolvedValue([{ id: "c1", shapeId: "db-1" }]);

    const result = await replaceBoardShapes("board-1", "user-1", []); // delete all
    // Empty shapes path returns raw prisma { id, shapeId } without mapping to commentId
    expect(result.orphanedComments).toEqual([{ id: "c1", shapeId: "db-1" }]);
  });
});

describe("Shape System - Board Object CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a shape object", async () => {
    const { createBoardObject } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.shape.create = vi.fn().mockResolvedValue({
      id: "shape-1", boardId: "board-1", type: "RECTANGLE", data: {},
    });

    const result = await createBoardObject("board-1", "user-1", { type: "rectangle", data: { x: 10, y: 10 } });
    expect(result.id).toBe("shape-1");
  });

  it("normalizes shape types", async () => {
    const { createBoardObject } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.shape.create = vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...data }));

    const r1 = await createBoardObject("b1", "u1", { type: "rectangle", data: {} });
    expect(mockPrisma.shape.create.mock.calls[0][0].data.type).toBe("RECTANGLE");

    mockPrisma.shape.create.mockClear();
    const r2 = await createBoardObject("b1", "u1", { type: "draw", data: {} });
    expect(mockPrisma.shape.create.mock.calls[0][0].data.type).toBe("DRAW");
  });
});

describe("Shape System - Shape Type Mapping", () => {
  it("maps all valid shape types correctly", async () => {
    const { createBoardObject } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.shape.create = vi.fn();

    const types = ["rectangle", "circle", "line", "arrow", "text", "image"];
    const expected = ["RECTANGLE", "CIRCLE", "LINE", "ARROW", "TEXT", "IMAGE"];

    for (let i = 0; i < types.length; i++) {
      mockPrisma.shape.create.mockClear();
      await createBoardObject("b1", "u1", { type: types[i], data: {} });
      expect(mockPrisma.shape.create.mock.calls[0][0].data.type).toBe(expected[i]);
    }
  });

  it("defaults unknown types to DRAW", async () => {
    const { createBoardObject } = await import("@/controllers/boards/boardServices.js");
    mockPrisma.shape.create = vi.fn();

    await createBoardObject("b1", "u1", { type: "freehand", data: {} });
    expect(mockPrisma.shape.create.mock.calls[0][0].data.type).toBe("DRAW");
  });
});
