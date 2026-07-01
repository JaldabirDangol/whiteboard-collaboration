"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Activity, Loader2 } from "lucide-react";
import { BoardActivity, getBoardActivity } from "@/lib/api";
import { cn } from "@/lib/utils";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";

type ActivityFeedProps = {
  boardId: string;
  currentUserId?: string;
  className?: string;
  userNames?: Record<string, string>;
};

const formatTimestamp = (dateLike: string) => {
  const date = new Date(dateLike);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const actionLabel = (action: string): string => {
  switch (action) {
    case "object.created": return "drew";
    case "object.updated": return "updated";
    case "object.deleted": return "removed";
    case "board.created": return "created the board";
    case "board.joined": return "joined the board";
    case "board.shared": return "shared the board";
    case "board.deleted": return "deleted the board";
    case "board:undo": return "undid last action";
    case "board:redo": return "redid last action";
    case "snapshot:restore": return "restored a snapshot";
    case "comment.created": return "commented on";
    case "comment.deleted": return "deleted a comment on";
    default: return action;
  }
};

const actionTypeLabel = (type?: string): string => {
  switch (type) {
    case "rectangle": return "rectangle";
    case "circle": return "circle";
    case "ellipse": return "ellipse";
    case "line": return "line";
    case "arrow": return "arrow";
    case "text": return "text";
    case "image": return "image";
    case "draw": return "drawing";
    case "pen": return "drawing";
    default: return "shape";
  }
};

type ActivityPayload = {
  action: string;
  userId: string;
  metadata?: Record<string, unknown>;
};

export default function ActivityFeed({
  boardId,
  currentUserId,
  className,
  userNames = {},
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<BoardActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const resolvedActivities = useMemo(() => {
    const items = activities.map((a) => ({
      ...a,
      resolvedName: userNames[a.userId] || a.user?.name || a.user?.email || "Unknown",
    }));
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activities, userNames]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getBoardActivity(boardId);
        if (!ignore) setActivities(data);
      } catch {
        if (!ignore) setActivities([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, [boardId]);

  useEffect(() => {
    const socket = acquireSocket();
    socketRef.current = socket;

    const onActivity = (payload: ActivityPayload) => {
      const liveEntry: BoardActivity = {
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        boardId,
        userId: payload.userId,
        action: payload.action,
        metadata: (payload.metadata ?? {}) as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActivities((prev) => [liveEntry, ...prev]);
    };

    socket.on("board:activity", onActivity);

    return () => {
      socket.off("board:activity", onActivity);
      socketRef.current = null;
      releaseSocket();
    };
  }, [boardId]);

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : null}

        {!loading && resolvedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Activity className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">No activity yet</p>
            <p className="text-xs text-slate-400">Changes to the board will appear here</p>
          </div>
        ) : null}

        {resolvedActivities.map((entry) => {
          const isMine = currentUserId ? entry.userId === currentUserId : false;
          const action = actionLabel(entry.action);
          const meta = entry.metadata ?? {};
          const metaType = meta.type as string | undefined;
          const shapeType = actionTypeLabel(metaType);
          const createdCount = meta.created as number | undefined;
          const updatedCount = meta.updated as number | undefined;
          const deletedCount = meta.deleted as number | undefined;

          let detail: string;
          if (["object.created", "object.updated", "object.deleted"].includes(entry.action)) {
            const total = (createdCount ?? 0) + (updatedCount ?? 0) + (deletedCount ?? 0);
            if (total > 1) {
              const parts: string[] = [];
              if (createdCount) parts.push(`${createdCount} ${entry.action === "object.created" ? "drew" : "added"}`);
              if (updatedCount) parts.push(`${updatedCount} updated`);
              if (deletedCount) parts.push(`${deletedCount} removed`);
              detail = parts.join(", ");
            } else if (metaType) {
              detail = `${action} a ${shapeType}`;
            } else {
              detail = `${action} a shape`;
            }
          } else if (["board.created", "board.joined", "board.shared", "board.deleted", "board:undo", "board:redo", "snapshot:restore"].includes(entry.action)) {
            detail = action;
          } else if (entry.action === "comment.created") {
            detail = metaType ? `commented on a ${shapeType}` : "commented on a shape";
          } else if (entry.action === "comment.deleted") {
            detail = metaType ? `deleted a comment on a ${shapeType}` : "deleted a comment on a shape";
          } else {
            detail = action;
          }

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                {(entry.resolvedName ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 leading-snug">
                  <span className="font-medium text-slate-900">
                    {isMine ? "You" : entry.resolvedName}
                  </span>{" "}
                  {detail}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatTimestamp(entry.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
