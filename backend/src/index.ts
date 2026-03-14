import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import userRoutes from "@/routes/userRoutes.js";
import { connectDB } from "./lib/prisma.js";
import messageRoutes from "./routes/messageRoute.js";
import boardRoutes from "./routes/boardRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

app.use("/api/auth", authRoutes);
app.use("/api/users",authMiddleware, userRoutes);
app.use("/api/boards", authMiddleware, boardRoutes);
app.use("/api/messages", authMiddleware, messageRoutes);

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