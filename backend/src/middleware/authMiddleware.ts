import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express"

interface AuthUser {
  id: string
  email: string
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthUser

    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}