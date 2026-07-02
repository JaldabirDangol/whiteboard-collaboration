import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:5173";

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockBoardCreate = vi.fn();
const mockBoardFindUnique = vi.fn();
const mockBoardFindMany = vi.fn();
const mockBoardFindFirst = vi.fn();
const mockBoardCount = vi.fn();
const mockBoardMemberFindUnique = vi.fn();
const mockBoardMemberCreate = vi.fn();
const mockNotificationFindUnique = vi.fn();
const mockNotificationUpdate = vi.fn();

vi.mock("@/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, create: mockUserCreate },
    board: { create: mockBoardCreate, findUnique: mockBoardFindUnique, findMany: mockBoardFindMany, findFirst: mockBoardFindFirst, count: mockBoardCount, update: vi.fn(), delete: vi.fn() },
    boardMember: { findUnique: mockBoardMemberFindUnique, create: mockBoardMemberCreate, findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
    notification: { findUnique: mockNotificationFindUnique, update: mockNotificationUpdate },
    $transaction: vi.fn((cb: any) => cb({
      shape: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      comment: { findMany: vi.fn(), deleteMany: vi.fn() },
    })),
    $executeRawUnsafe: vi.fn(),
  },
}));

const USER_ID = "test-user-id";
const USER_EMAIL = "test@test.com";

const validToken = jwt.sign({ id: USER_ID, email: USER_EMAIL }, process.env.JWT_SECRET);

describe("REST E2E", () => {
  let app: any;

  beforeAll(async () => {
    const { createApp } = await import("@/app.js");
    app = createApp().app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /healthz returns ok", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /readyz returns ready", async () => {
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });

  it("GET / returns Hello World", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Hello World!");
  });

  it("POST /api/auth/login returns 400 with invalid credentials", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@test.com", password: "any" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/signup creates a user", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "new-user-id", email: "newuser@test.com", name: null });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "newuser@test.com", password: "Secure123!" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("newuser@test.com");
  });

  it("GET /api/boards/user returns 401 without auth", async () => {
    const res = await request(app).get("/api/boards/user");
    expect(res.status).toBe(401);
  });

  it("GET /api/boards/user returns boards with valid token", async () => {
    mockBoardFindMany.mockResolvedValue([{ id: "b1", title: "My Board", createdAt: new Date(), updatedAt: new Date(), creatorId: USER_ID, members: [] }]);
    mockBoardCount.mockResolvedValue(1);

    const res = await request(app)
      .get("/api/boards/user")
      .set("Cookie", `token=${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.boards).toBeDefined();
  });

  it("POST /api/boards creates a board", async () => {
    mockBoardCreate.mockResolvedValue({
      id: "new-board-id",
      title: "New Board",
      creatorId: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockBoardFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/boards/create")
      .send({ title: "New Board" })
      .set("Cookie", `token=${validToken}`)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Board");
  });

  it("DELETE /api/boards/:id deletes a board", async () => {
    mockBoardFindUnique.mockResolvedValue({ id: "b1", title: "My Board", creatorId: USER_ID });
    mockBoardMemberFindUnique.mockResolvedValue({ userId: USER_ID, boardId: "b1", role: "ADMIN" });

    const res = await request(app)
      .delete("/api/boards/b1")
      .set("Cookie", `token=${validToken}`);

    expect(res.status).toBe(200);
  });
});
