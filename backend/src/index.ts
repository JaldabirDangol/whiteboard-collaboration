import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import userRoutes from "@/routes/userRoutes.js";
import { connectDB } from "./lib/prisma.js";
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

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const server = http.createServer(app);
const io = initSocket(server);

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
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();