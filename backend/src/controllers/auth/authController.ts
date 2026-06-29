import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function cookieOptions() {
  const frontendUrl = process.env.FRONTEND_URL || "";
  const isCrossOrigin = frontendUrl && (
    frontendUrl.startsWith("https://") ||
    (frontendUrl.includes("//") && !frontendUrl.includes("localhost") && !frontendUrl.includes("127.0.0.1") && !frontendUrl.includes("0.0.0.0"))
  );
  return {
    httpOnly: true as const,
    secure: isCrossOrigin,
    sameSite: isCrossOrigin ? "none" as const : "lax" as const,
    maxAge: 3600 * 1000,
  };
}

export async function Signup(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail || !password) return res.status(400).json({ error: "Email and password are required" });

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) return res.status(400).json({ error: "Email already in use" });

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: await bcrypt.hash(password, 10)
            }
        });
        return res.status(201).json({
            id: user.id,
            email: user.email,
            message: "User created successfully"
        });
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
    
}

export async function Login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail || !password) return res.status(400).json({ error: "Email and password are required" });

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user || !user.password) return res.status(400).json({ error: "User does not exist" });

       const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ error: "Invalid email or password" });

     const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: "1h" })


     res.cookie("token", token, cookieOptions())
return res.status(200).json({ id: user.id, email: user.email, message: "Login successful" }) 
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
}


export async function Logout(req: Request, res: Response) {
  try {
    res.clearCookie("token", cookieOptions())
    return res.status(200).json({ message: "Logged out" })
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }
}