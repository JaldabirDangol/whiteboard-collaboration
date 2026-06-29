"use client";
import { BoardSidebar, type BoardFilter } from "@/components/boards/sidebar";
import Navbar from "@/components/navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BoardGrid } from "@/components/boards/boardGrid";
import { useUserStore } from "@/store/useUserStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBoards, toggleStarBoard, type BoardWithMembers } from "@/lib/api";
import { toast } from "sonner";

export default function BoardsPage() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const router = useRouter();

  const [filter, setFilter] = useState<BoardFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: boards, isLoading, refetch } = useQuery({
    queryKey: ["boards", filter, search],
    enabled: Boolean(user),
    queryFn: async () => {
      try {
        return await getBoards({ filter, search: search || undefined });
      } catch {
        router.replace("/login");
        return [];
      }
    },
  });

  const starMutation = useMutation({
    mutationFn: toggleStarBoard,
    onSuccess: () => {
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle star");
    },
  });

  const handleToggleStar = (boardId: string) => {
    starMutation.mutate(boardId);
  };

  const isStarred = (board: BoardWithMembers) => {
    const member = board.members.find((m) => m.userId === user?.id);
    return member?.isStarred ?? false;
  };

  if (loading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <BoardSidebar activeFilter={filter} onFilterChange={setFilter} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 pt-4">
          <Navbar search={search} onSearchChange={setSearch} />
        </div>
        <main className="flex-1 overflow-auto p-6">
          <BoardGrid
            boards={boards || []}
            onToggleStar={handleToggleStar}
            isStarred={isStarred}
          />
        </main>
      </div>
    </div>
  );
}