import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

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

export async function ForgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      email: normalizedEmail,
      expiresAt: new Date(Date.now() + 3600_000),
    });

    console.log(`[reset-password] Token for ${normalizedEmail}: ${token}`);

    return res.json({ message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function ResetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: entry.email },
      data: { password: hashedPassword },
    });

    resetTokens.delete(token);
    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}