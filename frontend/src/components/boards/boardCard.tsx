"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Clock, MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardWithMembers } from "@/lib/api";

interface BoardCardProps {
  board: BoardWithMembers;
  onToggleStar?: (boardId: string) => void;
  isStarred?: boolean;
}

export const BoardCard = ({ board, onToggleStar, isStarred = false }: BoardCardProps) => {
  const isValidUrl = board?.thumbnailUrl?.startsWith("/") || board?.thumbnailUrl?.startsWith("http");
  const [imgSrc, setImgSrc] = useState(isValidUrl ? board.thumbnailUrl : null);

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

  return (
    <Link
      href={`/boards/${board.id}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="relative h-40 w-full bg-gradient-to-br from-slate-50 to-slate-100">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={board.title || "Board thumbnail"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImgSrc(null)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mb-2 shadow-inner">
              <span className="text-2xl">🎨</span>
            </div>
            <span className="text-xs font-medium text-slate-400">No Preview</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {onToggleStar && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleStar(board.id);
            }}
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

        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
          {board.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
          <Clock className="h-3 w-3" />
          <span>{formatDate(board.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
};
