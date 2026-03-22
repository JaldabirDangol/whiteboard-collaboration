import { Router } from "express";
import { authMiddleware } from "@/middleware/authMiddleware.js";
const router: Router = Router();
import type { Request, Response } from "express";

 async function getCurrentUser(req:Request, res:Response) {
  try {
    const user = req.user; 
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

router.get("/", getCurrentUser);

export default router;