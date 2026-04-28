import { Router } from "express";
import * as boardController from "@/controllers/boards/boardController.js";
import * as objectController from "@/controllers/boards/boardObjectController.js";
import * as settingsController from "@/controllers/boards/boardSettingsController.js";
import { getBoardLogs } from "@/controllers/boards/auditLogController.js";
import { checkBoardAccess } from "@/middleware/checkBoardAccess.js";

const boardRoutes:Router = Router();

boardRoutes.post("/create", boardController.createBoard);
boardRoutes.get("/user", boardController.getBoardsForUser);
boardRoutes.get("/:id/shapes", boardController.getBoardShapes);
boardRoutes.post("/:id/join", boardController.joinBoard);
boardRoutes.post("/:id/share", boardController.shareBoard);
boardRoutes.get("/:id", boardController.getBoard);
boardRoutes.put("/:id", boardController.updateBoardMember);
boardRoutes.delete("/:id", boardController.deleteBoard);

// Board Object CRUD — RBAC-protected
boardRoutes.post("/:id/objects", checkBoardAccess("EDITOR"), objectController.createObject);
boardRoutes.patch("/:id/objects/:objectId", checkBoardAccess("EDITOR"), objectController.updateObject);
boardRoutes.delete("/:id/objects/:objectId", checkBoardAccess("EDITOR"), objectController.deleteObject);

// Board Snapshots / Versioning
boardRoutes.get("/:id/snapshots", checkBoardAccess("VIEWER"), objectController.getSnapshots);
boardRoutes.get("/:id/snapshots/:snapshotId", checkBoardAccess("VIEWER"), objectController.getSnapshotById);

// Board Settings
boardRoutes.get("/:id/settings", checkBoardAccess("VIEWER"), settingsController.getSettings);
boardRoutes.patch("/:id/settings", checkBoardAccess("ADMIN"), settingsController.updateSettings);

// Audit Logs (admin only)
boardRoutes.get("/:id/logs", getBoardLogs);

export default boardRoutes;