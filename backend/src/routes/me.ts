import { Router } from "express";
import { prisma } from "@/lib/prisma.js";
const router: Router = Router();
import type { Request, Response } from "express";

 async function getCurrentUser(req:Request, res:Response) {
  try {
    const tokenUser = req.user;
    if (!tokenUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await prisma.user.findUnique({
      where: { id: tokenUser.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

router.get("/", getCurrentUser);

export default router;