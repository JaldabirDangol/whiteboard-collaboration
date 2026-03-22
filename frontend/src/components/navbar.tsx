"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/constant";
import { toast } from "sonner";


const Navbar = () => {
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createBoard = useMutation({
  mutationFn: async (data: { title: string; thumbnailUrl: string }) => {
    const res = await fetch(`${apiUrl}/boards/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        ...data,
        visibility: "private",
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to create board");
    }

    return json;
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    setOpen(false);
    setTitle("");
    setThumbnailUrl("");
    toast.success("Board created successfully!");
  },
});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createBoard.mutate({ title, thumbnailUrl });
  };

  return (
    <div className="flex justify-between">
      <input
        type="text"
        placeholder="Search..."
        className="border rounded px-4 py-2 w-64"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="py-2 px-4 rounded-sm shadow-sm bg-blue-900 text-white">
          Create Board
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Board title"
              className="w-full border p-2 rounded"
            />
               <input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Thumbnail URL"
              className="w-full border p-2 rounded"
            />
            <button
              type="submit"
              disabled={createBoard.isPending}
              className="w-full bg-black text-white py-2 rounded"
            >
              {createBoard.isPending ? "Creating..." : "Create"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Navbar;