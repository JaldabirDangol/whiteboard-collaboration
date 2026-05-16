import type { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import * as assetService from "./assetService.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    const boardId = req.body.boardId as string | undefined;
    const userId = req.user?.id;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!file) return res.status(400).json({ error: "No file provided" });
    if (!boardId) return res.status(400).json({ error: "boardId is required" });
    if (!uploadPreset) return res.status(400).json({ error: "CLOUDINARY_UPLOAD_PRESET is required" });

    // Upload to Cloudinary using the configured unsigned preset
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.unsigned_upload_stream(
        uploadPreset,
        {
          resource_type: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    const uploadResult = result as { secure_url: string; public_id: string };
    const fileUrl = uploadResult.secure_url;

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
