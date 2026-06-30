"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BoardComment,
  createComment,
  deleteComment,
  getBoardComments,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";

type ShapeCommentsProps = {
  boardId: string;
  currentUserId?: string;
  shapeId?: string | null;
  className?: string;
  shapeTypeMap?: Record<string, string>;
};

const formatTimestamp = (dateLike: string) => {
  const date = new Date(dateLike);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ShapeComments({
  boardId,
  currentUserId,
  shapeId,
  className,
  shapeTypeMap = {},
}: ShapeCommentsProps) {
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [comments]
  );

  const scrollToBottom = useCallback(() => {
    const container = listRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadComments = async () => {
      setLoading(true);
      try {
        const data = await getBoardComments(boardId);
        if (!ignore) {
          const filtered = shapeId
            ? data.filter((c) => c.shapeId === shapeId)
            : data;
          setComments(filtered);
        }
      } catch {
        if (!ignore) setComments([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadComments();

    return () => {
      ignore = true;
    };
  }, [boardId, shapeId]);

  useEffect(() => {
    scrollToBottom();
  }, [sortedComments, scrollToBottom]);

  useEffect(() => {
    const socket = acquireSocket();
    socketRef.current = socket;

    const onCommentNew = (comment: BoardComment) => {
      if (shapeId && comment.shapeId !== shapeId) return;
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };

    const onCommentRemoved = ({ commentId, shapeId: removedShapeId }: { commentId: string; shapeId: string }) => {
      if (shapeId && removedShapeId !== shapeId) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    socket.on("comment:new", onCommentNew);
    socket.on("comment:removed", onCommentRemoved);

    return () => {
      socket.off("comment:new", onCommentNew);
      socket.off("comment:removed", onCommentRemoved);
      socketRef.current = null;
      releaseSocket();
    };
  }, [boardId, shapeId]);

  const handleSend = async () => {
    const value = input.trim();
    if (!value || sending || !shapeId) return;

    setSending(true);
    try {
      await createComment(boardId, shapeId, value);
      setInput("");
    } catch {
      toast.error("Failed to create comment. The shape may not be saved yet.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (comment: BoardComment) => {
    const canDelete = currentUserId && comment.userId === currentUserId;
    if (!canDelete) return;

    try {
      await deleteComment(comment.id, boardId, comment.shapeId);
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const shapeTypeLabel = (type: string) => {
    switch (type) {
      case "rectangle": return "rectangle";
      case "circle": return "circle";
      case "ellipse": return "ellipse";
      case "line": return "line";
      case "text": return "text";
      case "image": return "image";
      default: return "shape";
    }
  };

  const renderComment = (comment: BoardComment) => {
    const isMine = currentUserId ? comment.userId === currentUserId : false;
    const sender = comment.user?.name || comment.user?.email || "Anonymous";
    const stype = shapeTypeMap[comment.shapeId];
    const typeLabel = stype ? shapeTypeLabel(stype) : null;

    return (
      <div
        key={comment.id}
        className={cn(
          "group max-w-[88%] rounded-2xl px-3.5 py-2.5",
          isMine
            ? "ml-auto bg-indigo-600 text-white rounded-br-lg"
            : "bg-slate-100 text-slate-900 rounded-bl-lg"
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("text-[10px] font-medium", isMine ? "text-indigo-200" : "text-slate-500")}>
            {isMine ? "You" : sender}
          </span>
          <span className={cn("text-[10px]", isMine ? "text-indigo-200" : "text-slate-400")}>
            {formatTimestamp(comment.createdAt)}
          </span>
        </div>
        {typeLabel ? (
          <span className={cn("text-[10px] font-medium", isMine ? "text-indigo-300" : "text-indigo-500")}>
            on a {typeLabel}
          </span>
        ) : null}
        <p className="text-sm leading-relaxed">{comment.content.replace(/\s{3,}/g, " ").replace(/\n{3,}/g, "\n\n")}</p>
        {isMine ? (
          <button
            type="button"
            onClick={() => handleDelete(comment)}
            className="mt-1.5 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity text-indigo-200"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : null}

        {!loading && sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <MessageCircle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              {shapeId ? "No comments on this shape" : "No comments yet"}
            </p>
            <p className="text-xs text-slate-400">
              {shapeId ? "Add a comment to this shape" : "Select a shape to add comments"}
            </p>
          </div>
        ) : null}

        {sortedComments.map(renderComment)}
      </div>

      {shapeId ? (
        <div className="border-t border-slate-100 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Add a comment..."
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white transition hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
