import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") || connectionString.includes("sslmode=verify-full")
      ? { rejectUnauthorized: false }
      : connectionString.includes("sslmode=disable")
        ? false
        : connectionString.includes("sslmode=no-verify")
          ? { rejectUnauthorized: false }
          : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function connectDB() {
  try {
    await prisma.$connect()
    console.log("Database connected successfully")
  } catch (error) {
    console.error("Database connection failed:", error)
    process.exit(1)
  }
}

export { prisma, connectDB };
