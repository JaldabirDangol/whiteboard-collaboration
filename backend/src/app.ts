import express, { type Express } from "express";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import userRoutes from "@/routes/userRoutes.js";
import messageRoutes from "@/routes/messageRoute.js";
import boardRoutes from "@/routes/boardRoutes.js";
import uploadRoutes from "@/routes/uploadRoutes.js";
import commentRoutes from "@/routes/commentRoutes.js";
import notificationRoutes from "@/routes/notificationRoutes.js";
import authRoutes from "@/routes/authRoutes.js";
import meRout from "@/routes/me.js";
import { authMiddleware } from "@/middleware/authMiddleware.js";
import { initSocket } from "@/socket/index.js";
import type { Server as SocketIOServer } from "socket.io";

export function createApp(): { app: Express; server: http.Server; io: SocketIOServer } {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const server = http.createServer(app);
  const io = initSocket(server);

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/readyz", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/auth/me", authMiddleware, meRout);
  app.use("/api/users", authMiddleware, userRoutes);
  app.use("/api/boards", authMiddleware, boardRoutes);
  app.use("/api/messages", authMiddleware, messageRoutes);
  app.use("/api/upload", authMiddleware, uploadRoutes);
  app.use("/api/comments", authMiddleware, commentRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });

  return { app, server, io };
}
