import { Router, type Router as RouterType } from "express";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/controllers/notifications/notificationController.js";
import { authMiddleware } from "@/middleware/authMiddleware.js";

const notificationRoutes: RouterType = Router();

notificationRoutes.get("/", authMiddleware, getNotifications);
notificationRoutes.post("/:id/read", authMiddleware, markNotificationRead);
notificationRoutes.post("/read-all", authMiddleware, markAllNotificationsRead);

export default notificationRoutes;
