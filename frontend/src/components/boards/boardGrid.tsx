"use client";

import { BoardCard } from "./boardCard";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/constant";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import type { BoardWithMembers } from "@/lib/api";
import { deleteBoard } from "@/lib/api";

interface BoardGridProps {
  boards: BoardWithMembers[];
  onToggleStar?: (boardId: string) => void;
  isStarred?: (board: BoardWithMembers) => boolean;
}

export const BoardGrid = ({ boards, onToggleStar, isStarred }: BoardGridProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createBoard = useMutation({
    mutationFn: async (data: { title: string; thumbnailUrl: string }) => {
      const res = await fetch(`${apiUrl}/boards/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, visibility: "private" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create board");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setOpen(false);
      setTitle("");
      toast.success("Board created!");
      router.push(`/boards/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    createBoard.mutate({ title, thumbnailUrl: "" });
  };

  const handleDelete = async (boardId: string) => {
    await deleteBoard(boardId);
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    toast.success("Board deleted");
  };

  if (!boards.length) {
    return (
      <div className="flex flex-col items-center justify-center mt-24 text-center">
        <div className="h-24 w-24 rounded-3xl bg-accent/10 flex items-center justify-center mb-6">
          <span className="text-4xl font-bold text-accent">B</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          No boards yet
        </h2>

        <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">
          Create your first board to start collaborating, sketching ideas,
          and organizing your work.
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-all shadow-lg shadow-accent/25">
            <Plus className="h-5 w-5" />
            Create Board
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Create New Board</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Board title"
                className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                autoFocus
              />
              <button
                type="submit"
                disabled={createBoard.isPending}
              className="w-full bg-accent text-white py-3 rounded-xl font-medium hover:bg-accent-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createBoard.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {createBoard.isPending ? "Creating..." : "Create Board"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group min-h-[13rem]">
          <div className="h-12 w-12 rounded-xl bg-slate-100 group-hover:bg-accent/10 flex items-center justify-center mb-3 transition-colors">
            <Plus className="h-6 w-6 text-slate-400 group-hover:text-accent" />
          </div>
          <span className="text-sm font-medium text-slate-500 group-hover:text-accent">
            New Board
          </span>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Create New Board</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Board title"
              className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              autoFocus
            />
            <button
              type="submit"
              disabled={createBoard.isPending}
              className="w-full bg-accent text-white py-3 rounded-xl font-medium hover:bg-accent-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createBoard.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {createBoard.isPending ? "Creating..." : "Create Board"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {boards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          onToggleStar={onToggleStar}
          onDelete={handleDelete}
          isStarred={isStarred?.(board) ?? false}
        />
      ))}
    </div>
  );
};
