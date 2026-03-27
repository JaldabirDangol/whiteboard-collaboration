"use client";
import { BoardSidebar } from "@/components/boards/sidebar";
import Navbar from "@/components/navbar";
import { useQuery} from "@tanstack/react-query";
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

  if (loading || !user || isLoading) return <p>Loading...</p>;
  return (
    <div className="flex h-screen">
      <BoardSidebar />

      <div className="flex-1 p-6">
        <Navbar />
        <BoardGrid boards={boards} />
      </div>
    </div>
  );
}