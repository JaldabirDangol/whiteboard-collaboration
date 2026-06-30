import * as Y from "yjs";
import { getYDoc } from "@/socket/yjs.js";
import { getIO } from "@/socket/index.js";
import {
  replaceBoardShapes,
  getBoardSnapshotById,
  setBoardCurrentSnapshotVersion,
} from "@/controllers/boards/boardServices.js";
import { logAction } from "@/lib/auditLog.js";

const SHAPES_KEY = "shapes";
const UNDO_REDO_ORIGIN = "undo-redo";

function extractShapesFromSnapshot(snapshot: { data?: unknown } | null) {
  if (!snapshot || typeof snapshot.data !== "object" || snapshot.data === null) {
    return [];
  }

  const payload = snapshot.data as { shapes?: unknown };
  return Array.isArray(payload.shapes) ? payload.shapes : [];
}

function applyShapesToDoc(doc: Y.Doc, shapes: unknown[]) {
  doc.getMap<string>("board").set(SHAPES_KEY, JSON.stringify(shapes));
}

export async function restoreSnapshot(boardId: string, userId: string, snapshotId: string) {
  const snapshot = await getBoardSnapshotById(snapshotId);
  if (!snapshot || snapshot.boardId !== boardId) {
    throw new Error("Snapshot not found");
  }

  const shapes = extractShapesFromSnapshot(snapshot);

  // DB first — if this fails, we abort without corrupting the in-memory Y.Doc
  await replaceBoardShapes(boardId, userId, shapes as Record<string, unknown>[]);
  await setBoardCurrentSnapshotVersion(boardId, snapshot.version);

  const doc = getYDoc(boardId);

  doc.transact(() => {
    applyShapesToDoc(doc, shapes);
  }, UNDO_REDO_ORIGIN);

  logAction({
    boardId,
    userId,
    action: "snapshot:restore",
    metadata: { version: snapshot.version, snapshotId },
  }).catch(() => {});

  const state = Y.encodeStateAsUpdate(doc);
  const io = getIO();
  io.to(boardId).emit("board:state", Array.from(state));
}
