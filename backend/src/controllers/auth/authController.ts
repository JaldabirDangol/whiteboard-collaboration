import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function Signup(req: Request, res: Response) {

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        if (await prisma.user.findUnique({ where: { email } })) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const user = await prisma.user.create({
            data: {
                email,
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
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return res.status(400).json({ error: "Invalid email or password" });

       const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ error: "Invalid email or password" });

     const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: "1h" })

   res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 3600 * 1000 // 1 hour
})
return res.status(200).json({ id: user.id, email: user.email, message: "Login successful" }) 
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
}


export async function Logout(req: Request, res: Response) {
  try {
    res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "strict" }) 
    return res.status(200).json({ message: "Logged out" })
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }
}