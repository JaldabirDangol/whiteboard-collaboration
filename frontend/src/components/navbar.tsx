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
import { logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { LogOut, Plus, Search, Loader2 } from "lucide-react";
import NotificationBell from "@/components/notification-bell";

interface NavbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
}

const Navbar = ({ search = "", onSearchChange }: NavbarProps) => {
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const userInitials = user?.email
    ? user.email.split("@")[0].slice(0, 2).toUpperCase()
    : "U";
  const clearUser = useUserStore((state) => state.clearUser);

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

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setOpen(false);
      setTitle("");
      setThumbnailUrl("");
      toast.success("Board created!");
      router.push(`/boards/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      toast.success("Logged out");
      router.replace("/login");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to logout");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    createBoard.mutate({ title, thumbnailUrl });
  };

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search boards..."
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="flex items-center gap-2.5 pr-3 py-1.5 pl-1.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-medium shadow-sm">
            {userInitials}
          </div>
          <span className="text-sm font-medium text-slate-600 hidden sm:block">
            {user?.email?.split("@")[0]}
          </span>
        </div>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-all shadow-md shadow-accent/20">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Board</span>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Create New Board</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-slate-700">
                  Board Name
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Awesome Board"
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="thumbnail" className="text-sm font-medium text-slate-700">
                  Thumbnail URL (optional)
                </label>
                <input
                  id="thumbnail"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
              </div>

              <button
                type="submit"
                disabled={createBoard.isPending}
                className="w-full bg-accent text-white py-3 rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
    </div>
  );
};

export default Navbar;
