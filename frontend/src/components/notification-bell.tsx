"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellDot, ExternalLink, CheckCheck, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationRead, markAllNotificationsRead, acceptInvitation, declineInvitation, type BoardNotification } from "@/lib/api";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isPendingInvite(n: BoardNotification) {
  return n.type === "share_invite" && (n.metadata as Record<string, unknown> | null)?.status === "pending";
}

function getInviteMeta(n: BoardNotification) {
  return (n.metadata as { status?: string; role?: string; sharedBy?: string } | null) ?? {};
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const acceptMut = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invitation accepted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const declineMut = useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invitation declined");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    const socket = acquireSocket();
    const refetch = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    socket.on("notification:new", refetch);
    socket.on("notification:updated", refetch);
    socket.on("connect", refetch);
    return () => {
      socket.off("notification:new", refetch);
      socket.off("notification:updated", refetch);
      socket.off("connect", refetch);
      releaseSocket();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? <BellDot className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              notifications.map((n: BoardNotification) => {
                const pending = isPendingInvite(n);
                const meta = getInviteMeta(n);

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 text-left text-sm transition-colors border-b border-slate-50 last:border-b-0",
                      !n.readAt && "bg-indigo-50/40"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-slate-800", !n.readAt && "font-medium")}>{n.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatTimeAgo(n.createdAt)}</p>

                      {pending && (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => acceptMut.mutate(n.id)}
                            disabled={acceptMut.isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineMut.mutate(n.id)}
                            disabled={declineMut.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </button>
                        </div>
                      )}

                      {!pending && meta.status === "accepted" && (
                        <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">Accepted</p>
                      )}
                      {!pending && meta.status === "declined" && (
                        <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Declined</p>
                      )}
                    </div>

                    {n.boardId && !pending && (
                      <button
                        type="button"
                        onClick={() => {
                          markRead.mutate(n.id);
                          router.push(`/boards/${n.boardId}`);
                          setOpen(false);
                        }}
                        className="mt-0.5 shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
