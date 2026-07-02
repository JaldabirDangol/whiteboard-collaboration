import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import * as Y from "yjs";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import type { AddressInfo } from "net";


process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:5173";

const mockBoardMember = vi.fn();
const mockBoardFindUnique = vi.fn();
const mockShapeFindMany = vi.fn();
const mockSnapshotFindFirst = vi.fn();
const mockMessageCreate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/lib/prisma.js", () => ({
  prisma: {
    boardMember: { findUnique: mockBoardMember },
    board: { findUnique: mockBoardFindUnique },
    shape: { findMany: mockShapeFindMany },
    snapshot: { findFirst: mockSnapshotFindFirst, findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    message: { create: mockMessageCreate, findUnique: vi.fn(), delete: vi.fn() },
    comment: { findUnique: vi.fn(), delete: vi.fn() },
    user: { findUnique: mockUserFindUnique },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((cb: any) => {
      const tx = {
        shape: {
          findMany: mockShapeFindMany,
          findUnique: vi.fn(),
          upsert: vi.fn(),
          deleteMany: vi.fn(),
        },
        comment: { findMany: vi.fn(), deleteMany: vi.fn() },
      };
      return cb(tx);
    }),
  },
}));

const BOARD_ID = "00000000-0000-4000-a000-000000000001";
const USER_ID = "test-user-id";
const USER_EMAIL = "test@test.com";

const validToken = jwt.sign({ id: USER_ID, email: USER_EMAIL }, process.env.JWT_SECRET);

function connectClient(port: number, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      auth: { token },
      forceNew: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("Socket connection timeout")), 3000);
  });
}

function waitForEvent(socket: ClientSocket, event: string, timeout = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe("Socket Integration", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const { createApp } = await import("@/app.js");
    const created = createApp();
    server = created.server;

    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardMember.mockResolvedValue({ userId: USER_ID, boardId: BOARD_ID, role: "EDITOR" });
    mockBoardFindUnique.mockResolvedValue({ id: BOARD_ID, currentSnapshotVersion: null });
    mockShapeFindMany.mockResolvedValue([]);
    mockSnapshotFindFirst.mockResolvedValue(null);
    mockMessageCreate.mockImplementation((data: any) =>
      Promise.resolve({
        id: "msg-1",
        ...data.data,
        user: { id: USER_ID, name: "Test", email: USER_EMAIL },
      })
    );
    mockUserFindUnique.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: "Test" });
  });

  it("rejects connection without valid JWT", async () => {
    await expect(connectClient(port, "")).rejects.toThrow();
  });

  it("accepts connection with valid JWT", async () => {
    const socket = await connectClient(port, validToken);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it("joins board and receives board:init", async () => {
    const socket = await connectClient(port, validToken);
    socket.emit("board:join", BOARD_ID);

    const data = await waitForEvent(socket, "board:init");
    expect(data).toHaveProperty("yjsState");
    expect(data).toHaveProperty("serverTime");
    expect(Array.isArray(data.yjsState)).toBe(true);

    socket.disconnect();
  });

  it("returns error when joining board without access", async () => {
    mockBoardMember.mockReset();
    mockBoardMember.mockResolvedValue(null);

    const socket = await connectClient(port, validToken);
    socket.emit("board:join", BOARD_ID);

    const data = await waitForEvent(socket, "error");
    expect(data.message).toContain("do not have access");

    socket.disconnect();
  });

  it("relays yjs:update to other room members", async () => {
    const socketA = await connectClient(port, validToken);
    const socketB = await connectClient(port, validToken);

    socketA.emit("board:join", BOARD_ID);
    await waitForEvent(socketA, "board:init");

    socketB.emit("board:join", BOARD_ID);
    await waitForEvent(socketB, "board:init");

    const doc = new Y.Doc();
    const boardMap = doc.getMap("board");
    boardMap.set("shape:test-1", JSON.stringify({ id: "test-1", type: "rect", x: 10, y: 10, w: 50, h: 50 }));
    const update = Y.encodeStateAsUpdate(doc);

    const recvPromise = waitForEvent(socketB, "yjs:update");
    socketA.emit("yjs:update", { boardId: BOARD_ID, update: Array.from(update) });

    const received = await recvPromise;
    expect(Array.isArray(received)).toBe(true);
    expect(received.length).toBeGreaterThan(0);

    socketA.disconnect();
    socketB.disconnect();
  });

  it("relays shape:draft to other room members", async () => {
    const socketA = await connectClient(port, validToken);
    const socketB = await connectClient(port, validToken);

    socketA.emit("board:join", BOARD_ID);
    await waitForEvent(socketA, "board:init");
    socketB.emit("board:join", BOARD_ID);
    await waitForEvent(socketB, "board:init");

    const draft = { id: "draft-1", type: "rect", x: 100, y: 100, w: 30, h: 30 };
    const recvPromise = waitForEvent(socketB, "shape:draft");
    socketA.emit("shape:draft", { boardId: BOARD_ID, draft });

    const received = await recvPromise;
    expect(received.draft).toEqual(draft);
    expect(received.userId).toBe(USER_ID);

    socketA.disconnect();
    socketB.disconnect();
  });

  it("relays cursor movement to other room members", async () => {
    const socketA = await connectClient(port, validToken);
    const socketB = await connectClient(port, validToken);

    socketA.emit("board:join", BOARD_ID);
    await waitForEvent(socketA, "board:init");
    socketB.emit("board:join", BOARD_ID);
    await waitForEvent(socketB, "board:init");

    const recvPromise = waitForEvent(socketB, "presence:cursorMove");
    socketA.emit("presence:cursorMove", { boardId: BOARD_ID, position: { x: 200, y: 300 } });

    const received = await recvPromise;
    expect(received.userId).toBe(USER_ID);
    expect(received.position).toEqual({ x: 200, y: 300 });

    socketA.disconnect();
    socketB.disconnect();
  });

  it("broadcasts chat message to room", async () => {
    const socketA = await connectClient(port, validToken);
    const socketB = await connectClient(port, validToken);

    socketA.emit("board:join", BOARD_ID);
    await waitForEvent(socketA, "board:init");
    socketB.emit("board:join", BOARD_ID);
    await waitForEvent(socketB, "board:init");

    const recvPromise = waitForEvent(socketB, "messageSent");
    socketA.emit("chat:send", { boardId: BOARD_ID, message: "Hello from test!" });

    const received = await recvPromise;
    expect(received.content).toBe("Hello from test!");
    expect(received.user.id).toBe(USER_ID);

    socketA.disconnect();
    socketB.disconnect();
  });

  it("blocks yjs:update for VIEWER role", async () => {
    mockBoardMember.mockReset();
    mockBoardMember.mockResolvedValue({ userId: USER_ID, boardId: BOARD_ID, role: "VIEWER" });

    const socket = await connectClient(port, validToken);
    socket.emit("board:join", BOARD_ID);
    await waitForEvent(socket, "board:init");

    const doc = new Y.Doc();
    doc.getMap("board").set("shape:test-2", JSON.stringify({ id: "test-2", type: "circle" }));
    const update = Y.encodeStateAsUpdate(doc);

    const forbiddenPromise = waitForEvent(socket, "board:forbidden");
    socket.emit("yjs:update", { boardId: BOARD_ID, update: Array.from(update) });

    const data = await forbiddenPromise;
    expect(data.message).toContain("editor access");

    socket.disconnect();
  });
});
