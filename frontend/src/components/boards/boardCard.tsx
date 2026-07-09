"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Clock, MoreHorizontal, Star, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardWithMembers } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface BoardCardProps {
  board: BoardWithMembers;
  onToggleStar?: (boardId: string) => void;
  onDelete?: (boardId: string) => Promise<void>;
  isStarred?: boolean;
}

export const BoardCard = ({ board, onToggleStar, onDelete, isStarred = false }: BoardCardProps) => {
  const isValidUrl = board?.thumbnailUrl?.startsWith("/") || board?.thumbnailUrl?.startsWith("http") || board?.thumbnailUrl?.startsWith("data:");
  const [imgSrc, setImgSrc] = useState(isValidUrl ? board.thumbnailUrl : null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setImgSrc(isValidUrl ? board.thumbnailUrl : null);
  }, [board?.thumbnailUrl, isValidUrl]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete?.(board.id);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setMenuOpen(false);
    }
  };

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <>
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-accent hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
      <Link href={`/boards/${board.id}`} className="block">
        <div className="relative h-40 w-full bg-gradient-to-br from-slate-50 to-slate-100">
          {imgSrc ? (
            imgSrc.startsWith("data:") ? (
              <img
                src={imgSrc}
                alt={board.title || "Board thumbnail"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={imgSrc}
                alt={board.title || "Board thumbnail"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                onError={() => setImgSrc(null)}
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-accent">A</span>
              </div>
              <span className="text-xs font-medium text-slate-400">No Preview</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      {onToggleStar && (
        <button
          onClick={() => onToggleStar(board.id)}
          className={cn(
            "absolute top-3 left-3 p-1.5 rounded-lg bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white",
            isStarred && "opacity-100"
          )}
        >
          <Star
            className={cn(
              "h-4 w-4",
              isStarred ? "fill-amber-400 text-amber-400" : "text-slate-500"
            )}
          />
        </button>
      )}

      <div className="absolute top-3 right-3 z-10">
        <button
          className="p-1.5 rounded-lg bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
        >
          <MoreHorizontal className="h-4 w-4 text-slate-500" />
        </button>
        {menuOpen && onDelete && (
          <div className="absolute right-0 top-9 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setConfirmOpen(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete board
            </button>
          </div>
        )}
      </div>

      <Link href={`/boards/${board.id}`} className="block p-4">
        <h3 className="font-semibold text-slate-800 truncate group-hover:text-accent transition-colors">
          {board.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
          <Clock className="h-3 w-3" />
          <span>{formatDate(board.updatedAt)}</span>
        </div>
      </Link>
    </div>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete board?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{board.title}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </DialogClose>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
