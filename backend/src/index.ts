import dotenv from "dotenv";
import { connectDB, prisma } from "./lib/prisma.js";
import { persistAllActiveBoards } from "@/socket/events/boardEvent.js";
import { getActiveBoardIds } from "@/socket/yjs.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3050;

const REQUIRED_ENVS = ["JWT_SECRET", "DATABASE_URL", "FRONTEND_URL"] as const;

const requireEnv = () => {
  const missing = REQUIRED_ENVS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
};

async function startServer() {
  try {
    requireEnv();
    await connectDB();

    const { server } = createApp();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down...`);
      console.log(`Persisting ${getActiveBoardIds().length} active Y.Docs...`);
      await persistAllActiveBoards();
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
