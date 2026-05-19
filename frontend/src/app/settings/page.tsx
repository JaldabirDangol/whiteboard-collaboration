"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { updateUser, deleteUser } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const clearUser = useUserStore((state) => state.clearUser);
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      toast.success("Profile updated");
      fetchCurrentUser();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      toast.success("Account deleted");
      router.replace("/");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-semibold text-slate-900 mb-8">Settings</h1>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Profile</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700 block mb-1">
                  Email
                </label>
                <input
                  id="email"
                  value={user.email}
                  disabled
                  className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label htmlFor="name" className="text-sm font-medium text-slate-700 block mb-1">
                  Display name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => updateMutation.mutate({ name: name.trim() || undefined })}
                disabled={updateMutation.isPending || name === (user.name ?? "")}
              >
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-red-900 mb-4">Danger zone</h2>
            <p className="text-sm text-slate-600 mb-4">
              Once you delete your account, there is no going back. All your boards and data will be lost.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete account
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete my account"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="text-slate-500"
              onClick={() => router.push("/boards")}
            >
              <LogOut className="h-4 w-4 mr-2 rotate-180" />
              Back to boards
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
