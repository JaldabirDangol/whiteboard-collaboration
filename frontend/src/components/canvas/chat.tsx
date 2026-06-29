"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Loader2, Send, Trash2, X } from "lucide-react";
import {
  BoardMessage,
  deleteBoardMessage,
  getBoardMessages,
  sendBoardMessage,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";

type ChatProps = {
  boardId: string;
  currentUserId?: string;
  className?: string;
  onClose?: () => void;
  showMobileClose?: boolean;
  showHeader?: boolean;
};

const formatTimestamp = (dateLike: string) => {
  const date = new Date(dateLike);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Chat({
  boardId,
  currentUserId,
  className,
  onClose,
  showMobileClose = false,
  showHeader = true,
}: ChatProps) {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    const container = listRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await getBoardMessages(boardId);
        if (!ignore) {
          setMessages(data);
        }
      } catch {
        if (!ignore) {
          setMessages([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [boardId]);

  useEffect(() => {
    scrollToBottom();
  }, [sortedMessages, scrollToBottom]);

  useEffect(() => {
    const socket = acquireSocket();
    socketRef.current = socket;

    const onMessageSent = (message: BoardMessage) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const onMessageDeleted = (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    const onUserOnline = () => {
      setOnlineCount((prev) => prev + 1);
    };

    const onUserOffline = () => {
      setOnlineCount((prev) => Math.max(1, prev - 1));
    };

    const onPresenceState = ({ userIds }: { boardId?: string; userIds?: string[] }) => {
      if (!Array.isArray(userIds)) return;
      setOnlineCount(Math.max(1, new Set(userIds).size));
    };

    socket.on("messageSent", onMessageSent);
    socket.on("messageDeleted", onMessageDeleted);
    socket.on("presence:userOnline", onUserOnline);
    socket.on("presence:userOffline", onUserOffline);
    socket.on("presence:state", onPresenceState);

    return () => {
      socket.off("messageSent", onMessageSent);
      socket.off("messageDeleted", onMessageDeleted);
      socket.off("presence:userOnline", onUserOnline);
      socket.off("presence:userOffline", onUserOffline);
      socket.off("presence:state", onPresenceState);
      socketRef.current = null;
      releaseSocket();
    };
  }, [boardId]);

  const handleSend = async () => {
    const value = input.trim();
    if (!value || sending) return;

    setSending(true);
    try {
      await sendBoardMessage(boardId, value);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (message: BoardMessage) => {
    const canDelete = currentUserId && message.userId === currentUserId;
    if (!canDelete) return;

    await deleteBoardMessage(message.id, boardId);
  };

  return (
    <aside className={cn("flex h-full min-h-0 w-full flex-col bg-white", className)}>
      {showHeader ? (
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Board Chat</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
              {onlineCount} online
            </p>
          </div>
          {showMobileClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : null}

        {!loading && sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">No messages yet</p>
            <p className="text-xs text-slate-400">Start the conversation</p>
          </div>
        ) : null}

        {sortedMessages.map((message) => {
          const isMine = currentUserId ? message.userId === currentUserId : false;
          const sender = message.user?.name || message.user?.email || "Anonymous";

          return (
            <div
              key={message.id}
              className={cn(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5",
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
                  {formatTimestamp(message.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{message.content}</p>

              {isMine ? (
                <button
                  type="button"
                  onClick={() => handleDelete(message)}
                  className={cn(
                    "mt-1.5 text-[10px] flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity",
                    isMine ? "text-indigo-200" : "text-rose-500"
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

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
            placeholder="Type a message..."
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
    </aside>
  );
}
