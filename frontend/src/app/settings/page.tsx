"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { updateUser, deleteUser } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
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
    if (user?.name) {
      const n = user.name;
      startTransition(() => setName(n));
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const userInitials = user.email
    ? user.email.split("@")[0].slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <button
          onClick={() => router.push("/boards")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to boards</span>
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/30">
            {userInitials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage your account and profile</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Profile</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700 block mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  value={user.email}
                  disabled
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1.5">Email cannot be changed</p>
              </div>

              <div>
                <label htmlFor="name" className="text-sm font-medium text-slate-700 block mb-1.5">
                  Display name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => updateMutation.mutate({ name: name.trim() || undefined })}
                disabled={updateMutation.isPending || name === (user.name ?? "")}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-600 mb-5">
              Once you delete your account, there is no going back. All your boards and data will be lost.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete account
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm font-medium text-red-800">Are you sure? This cannot be undone.</p>
                </div>
                <div className="flex gap-3">
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
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {deleteMutation.isPending ? "Deleting..." : "Delete my account"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
