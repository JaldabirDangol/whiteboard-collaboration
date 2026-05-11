"use client";
import { BoardSidebar } from "@/components/boards/sidebar";
import Navbar from "@/components/navbar";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/constant";
import { BoardGrid } from "@/components/boards/boardGrid";
import { useUserStore } from "@/store/useUserStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BoardsPage() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards"],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/boards/user`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/login");
        return [];
      }
      return res.json();
    },
  });

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
      <BoardSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 pt-4">
          <Navbar />
        </div>
        <main className="flex-1 overflow-auto p-6">
          <BoardGrid boards={boards || []} />
        </main>
      </div>
    </div>
  );
}