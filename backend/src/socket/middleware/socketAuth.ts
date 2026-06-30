import { Socket } from "socket.io"
import jwt from "jsonwebtoken"

const getTokenFromCookie = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(";").map((chunk) => chunk.trim())
  const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="))
  if (!tokenCookie) return null

  return decodeURIComponent(tokenCookie.slice("token=".length))
}

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
  const authToken = socket.handshake.auth?.token
  const headerAuth = socket.handshake.headers.authorization
  const bearerToken = headerAuth?.startsWith("Bearer ")
    ? headerAuth.slice("Bearer ".length)
    : null
  const cookieToken = getTokenFromCookie(socket.handshake.headers.cookie)

  const token = authToken || bearerToken || cookieToken

  if (!token) {
    return next(new Error("Unauthorized"))
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!)
    socket.data.user = user
    next()
  } catch {
    next(new Error("Unauthorized"))
  }
}