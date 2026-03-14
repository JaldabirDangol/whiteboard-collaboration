import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma.js";

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
                password
            }
        });
        return res.status(201).json(user);
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
    
}

export async function Login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        // In a real application, you would compare the hashed password here
        // For now, we'll just return the user if the email exists
        return res.status(200).json(user);
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
}

export async function Logout(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        // In a real application, you would compare the hashed password here
        // For now, we'll just return the user if the email exists
        return res.status(200).json(user);
    } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
    }
}