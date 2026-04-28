import type { Request, Response } from "express";
import path from "path";
import * as assetService from "./assetService.js";
import { UPLOAD_DIR } from "@/middleware/upload.js";

export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    const boardId = req.body.boardId as string | undefined;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!file) return res.status(400).json({ error: "No file provided" });
    if (!boardId) return res.status(400).json({ error: "boardId is required" });

    const fileUrl = `/api/files/${file.filename}`;

    const asset = await assetService.createAsset({
      boardId,
      uploadedBy: userId,
      url: fileUrl,
      mimetype: file.mimetype,
    });

    return res.status(201).json(asset);
  } catch (error) {
    console.error("[uploadFile]", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getFile(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "Filename is required" });
    }

    // Prevent path traversal
    const safeName = path.basename(filename as string);
    const filePath = path.join(UPLOAD_DIR, safeName);

    return res.sendFile(filePath);
  } catch (error) {
    console.error("[getFile]", error);
    return res.status(404).json({ error: "File not found" });
  }
}

export async function getAssetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await assetService.getAsset(id as string);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    return res.json(asset);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getBoardAssets(req: Request, res: Response) {
  try {
    const { boardId } = req.params;
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const assets = await assetService.getAssetsForBoard(boardId as string);
    return res.json(assets);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function deleteAssetHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const asset = await assetService.getAsset(id as string);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (asset.uploadedBy !== userId) {
      return res.status(403).json({ error: "Only the uploader can delete this asset" });
    }

    await assetService.deleteAsset(id as string);
    return res.json({ message: "Asset deleted" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
