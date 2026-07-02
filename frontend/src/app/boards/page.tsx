"use client";
import { BoardSidebar, type BoardFilter } from "@/components/boards/sidebar";
import Navbar from "@/components/navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BoardGrid } from "@/components/boards/boardGrid";
import { useUserStore } from "@/store/useUserStore";
import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getBoards, toggleStarBoard, type BoardWithMembers } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 12;

export default function BoardsPage() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const router = useRouter();

  const [filter, setFilter] = useState<BoardFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    startTransition(() => setPage(0));
  }, [filter, search]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["boards", filter, search, page],
    enabled: Boolean(user),
    queryFn: async () => {
      try {
        return await getBoards({ filter, search: search || undefined, skip: page * PAGE_SIZE, take: PAGE_SIZE });
      } catch {
        router.replace("/login");
        return { boards: [], total: 0 };
      }
    },
  });

  const boards = result?.boards ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    i === page
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}