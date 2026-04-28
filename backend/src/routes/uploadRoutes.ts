import { Router } from "express";
import { upload } from "@/middleware/upload.js";
import {
  uploadFile,
  getFile,
  getAssetById,
  getBoardAssets,
  deleteAssetHandler,
} from "@/controllers/upload/uploadController.js";

const uploadRoutes: Router = Router();

uploadRoutes.post("/", upload.single("file"), uploadFile);
uploadRoutes.get("/asset/:id", getAssetById);
uploadRoutes.get("/board/:boardId", getBoardAssets);
uploadRoutes.delete("/asset/:id", deleteAssetHandler);

export default uploadRoutes;

// File serving route is separate (mounted at /api/files/:filename in index.ts)
export { getFile };
