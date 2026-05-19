import { prisma } from "@/lib/prisma.js";
import * as userService from "./userServices.js";
import  type { Request, Response } from "express";


export async function getUserByEmail(req: Request, res: Response) {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") return res.status(400).json({ error: "Email is required" });

    const user = await userService.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name } = req.body;
    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({ error: "Name must be a string" });
    }

    const user = await userService.updateUser(userId, { name });
    return res.json({ message: "Profile updated", user });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await userService.deleteUser(userId);
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getUserBoardRole(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || req.user?.id;
    const { boardId } = req.query;
    if (!userId || typeof userId !== "string" || !boardId || typeof boardId !== "string") {
      return res.status(400).json({ error: "Board ID is required" });
    }

    const role = await userService.getUserBoardRole(userId, boardId);
    return res.json({ role });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}