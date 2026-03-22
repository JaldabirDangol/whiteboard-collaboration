"use client";
import { BoardSidebar } from "@/components/boards/sidebar";
import Navbar from "@/components/navbar";
import { useQuery} from "@tanstack/react-query";
import { apiUrl } from "@/constant";
import { BoardGrid } from "@/components/boards/boardGrid";


export default function BoardsPage() {

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/boards/user`, {
        credentials: "include",
      });
      return res.json();
    },
  });

  if (isLoading) return <p>Loading...</p>;
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