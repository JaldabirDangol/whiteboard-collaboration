import { Router } from "express";
import * as boardController from "@/controllers/boards/boardController.js";

const boardRoutes:Router = Router();

boardRoutes.post("/", boardController.createBoard);
boardRoutes.get("/:id", boardController.getBoard);
boardRoutes.put("/:id", boardController.updateBoardMember);
boardRoutes.delete("/:id", boardController.deleteBoard);

export default boardRoutes;