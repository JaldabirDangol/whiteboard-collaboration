import type { Request, Response } from "express";
import * as boardService from "./boardServices.js";
import { logAction } from "@/lib/auditLog.js";
import { restoreSnapshot } from "@/lib/boardRestore.js";

export async function createObject(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;
    const { type, data } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });
    if (!type || !data) return res.status(400).json({ error: "type and data are required" });

    const obj = await boardService.createBoardObject(boardId, userId, { type, data });
    await logAction({ boardId, userId, action: "object.created", metadata: { objectId: obj.id, type } });
    return res.status(201).json(obj);
  } catch (error) {
    console.error("[createObject]", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function updateObject(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const objectId = req.params.objectId as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId || !objectId) {
      return res.status(400).json({ error: "Board ID and Object ID are required" });
    }

    const existing = await boardService.getBoardObject(objectId);
    if (!existing || existing.boardId !== boardId) {
      return res.status(404).json({ error: "Object not found on this board" });
    }

    const updated = await boardService.updateBoardObject(objectId, req.body);
    await logAction({ boardId, userId: userId!, action: "object.updated", metadata: { objectId } });
    return res.json(updated);
  } catch (error) {
    console.error("[updateObject]", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function deleteObject(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const objectId = req.params.objectId as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId || !objectId) {
      return res.status(400).json({ error: "Board ID and Object ID are required" });
    }

    const existing = await boardService.getBoardObject(objectId);
    if (!existing || existing.boardId !== boardId) {
      return res.status(404).json({ error: "Object not found on this board" });
    }

    await boardService.deleteBoardObject(objectId);
    await logAction({ boardId, userId: userId!, action: "object.deleted", metadata: { objectId } });
    return res.json({ message: "Object deleted" });
  } catch (error) {
    console.error("[deleteObject]", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getSnapshots(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId) return res.status(400).json({ error: "Board ID is required" });

    const snapshots = await boardService.getBoardSnapshots(boardId);
    return res.json(snapshots);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function getSnapshotById(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const snapshotId = req.params.snapshotId as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId || !snapshotId) {
      return res.status(400).json({ error: "Board ID and Snapshot ID are required" });
    }

    const snapshot = await boardService.getBoardSnapshotById(snapshotId);
    if (!snapshot || snapshot.boardId !== boardId) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    return res.json(snapshot);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function restoreSnapshotAction(req: Request, res: Response) {
  try {
    const boardId = req.params.id as string;
    const snapshotId = req.params.snapshotId as string;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!boardId || !snapshotId) {
      return res.status(400).json({ error: "Board ID and Snapshot ID are required" });
    }

    await restoreSnapshot(boardId, userId, snapshotId);
    return res.json({ message: "Snapshot restored successfully" });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
