import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import userRoutes from "@/routes/userRoutes.js";
import { connectDB, prisma } from "./lib/prisma.js";
import messageRoutes from "./routes/messageRoute.js";
import boardRoutes from "./routes/boardRoutes.js";
import uploadRoutes, { getFile } from "./routes/uploadRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import { initSocket } from "@/socket/index.js";
import cookieParser from "cookie-parser";
import meRout from "@/routes/me.js";
import { UPLOAD_DIR } from "./middleware/upload.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const REQUIRED_ENVS = ["JWT_SECRET", "DATABASE_URL", "FRONTEND_URL"] as const;

const requireEnv = () => {
  const missing = REQUIRED_ENVS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
};

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
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const server = http.createServer(app);
const io = initSocket(server);

let isReady = false;

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  res.status(isReady ? 200 : 503).json({ status: isReady ? "ready" : "starting" });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth/me",authMiddleware, meRout);
app.use("/api/users",authMiddleware, userRoutes);
app.use("/api/boards", authMiddleware, boardRoutes);
app.use("/api/messages", authMiddleware, messageRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.get("/api/files/:filename", getFile);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function startServer() {
  try {
    requireEnv();
    await connectDB();
    isReady = true;

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      isReady = false;
      console.log(`Received ${signal}, shutting down...`);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();