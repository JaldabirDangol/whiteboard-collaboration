import { Router } from "express";
import * as boardController from "@/controllers/boards/boardController.js";
import * as objectController from "@/controllers/boards/boardObjectController.js";
import * as settingsController from "@/controllers/boards/boardSettingsController.js";
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
boardRoutes.patch("/:id/star", boardController.toggleStar);
boardRoutes.delete("/:id/members/:userId", boardController.removeMember);

// Board Object CRUD — RBAC-protected
boardRoutes.post("/:id/objects", checkBoardAccess("EDITOR"), objectController.createObject);
boardRoutes.patch("/:id/objects/:objectId", checkBoardAccess("EDITOR"), objectController.updateObject);
boardRoutes.delete("/:id/objects/:objectId", checkBoardAccess("EDITOR"), objectController.deleteObject);

// Board Snapshots / Versioning
boardRoutes.get("/:id/snapshots", checkBoardAccess("VIEWER"), objectController.getSnapshots);
boardRoutes.get("/:id/snapshots/:snapshotId", checkBoardAccess("VIEWER"), objectController.getSnapshotById);
boardRoutes.post("/:id/snapshots/:snapshotId/restore", checkBoardAccess("EDITOR"), objectController.restoreSnapshotAction);

// Board Settings
boardRoutes.get("/:id/settings", checkBoardAccess("VIEWER"), settingsController.getSettings);
boardRoutes.patch("/:id/settings", checkBoardAccess("ADMIN"), settingsController.updateSettings);

export default boardRoutes;