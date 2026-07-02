import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma.js";

// Helper: build Express req/res with cookie support
const buildReqRes = (body: Record<string, unknown> = {}, cookies: Record<string, string> = {}) => {
  const req = { body, cookies } as any;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  const res = { status, json, cookie, clearCookie } as any;
  return { req, res, json, status, cookie, clearCookie };
};

describe("Auth System - Signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("creates a user with valid email and password", async () => {
    const { Signup } = await import("@/controllers/auth/authController.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { req, res, json, status } = buildReqRes({ email: "test@example.com", password: "Secure123!" });
    await Signup(req, res);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", email: "test@example.com" })
    );
  });

  it("rejects duplicate email", async () => {
    const { Signup } = await import("@/controllers/auth/authController.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "existing", email: "dup@example.com" } as any);

    const { req, res, json, status } = buildReqRes({ email: "dup@example.com", password: "Secure123!" });
    await Signup(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: "Email already in use" }));
  });

  it("rejects missing email", async () => {
    const { Signup } = await import("@/controllers/auth/authController.js");
    const { req, res, json, status } = buildReqRes({ password: "Secure123!" });
    await Signup(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("rejects missing password", async () => {
    const { Signup } = await import("@/controllers/auth/authController.js");
    const { req, res, json, status } = buildReqRes({ email: "test@example.com" });
    await Signup(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });
});

describe("Auth System - Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("logs in with valid credentials and sets JWT cookie", async () => {
    const { Login } = await import("@/controllers/auth/authController.js");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: await bcrypt.hash("Secure123!", 10),
      name: null,
    } as any);

    const { req, res, json, status, cookie } = buildReqRes({ email: "test@example.com", password: "Secure123!" });
    await Login(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(cookie).toHaveBeenCalledWith("token", expect.any(String), expect.any(Object));
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.com" }));
  });

  it("rejects invalid password", async () => {
    const { Login } = await import("@/controllers/auth/authController.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: await bcrypt.hash("CorrectPass1!", 10),
    } as any);

    const { req, res, json, status } = buildReqRes({ email: "test@example.com", password: "WrongPass1!" });
    await Login(req, res);

    expect(status).toHaveBeenCalledWith(400);
  });

  it("rejects non-existent user", async () => {
    const { Login } = await import("@/controllers/auth/authController.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const { req, res, json, status } = buildReqRes({ email: "nobody@example.com", password: "Secure123!" });
    await Login(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: "User does not exist" }));
  });

  it("sets secure cookie for cross-origin FRONTEND_URL", async () => {
    process.env.FRONTEND_URL = "https://whiteboard.example.com";
    const { Login } = await import("@/controllers/auth/authController.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: await bcrypt.hash("Secure123!", 10),
    } as any);

    const { req, res, cookie } = buildReqRes({ email: "test@example.com", password: "Secure123!" });
    await Login(req, res);

    expect(cookie).toHaveBeenCalledWith("token", expect.any(String), expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3600000,
    }));
  });
});

describe("Auth System - Logout", () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  it("clears the token cookie", async () => {
    const { Logout } = await import("@/controllers/auth/authController.js");
    const { req, res, json, status, clearCookie } = buildReqRes();
    await Logout(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
  });
});

describe("Auth System - JWT Token Validation", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("generates a valid JWT with user id and email", () => {
    const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
    expect(decoded.id).toBe("user-1");
    expect(decoded.email).toBe("test@example.com");
  });

  it("rejects expired JWT", () => {
    const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET!, { expiresIn: "0s" });
    expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow();
  });

  it("rejects tampered JWT", () => {
    const token = jwt.sign({ id: "user-1", email: "test@example.com" }, "different-secret");
    expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow();
  });

  it("auth middleware rejects missing token", async () => {
    const { authMiddleware } = await import("@/middleware/authMiddleware.js");
    const req = { cookies: {} } as any;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("auth middleware accepts valid token", async () => {
    const { authMiddleware } = await import("@/middleware/authMiddleware.js");
    const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET!);
    const req = { cookies: { token } } as any;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as any;
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe("user-1");
  });
});
