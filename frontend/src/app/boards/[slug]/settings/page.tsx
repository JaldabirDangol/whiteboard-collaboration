"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, 
  Globe, 
  Lock, 
  Users, 
  Trash2, 
  ArrowLeft,
  Shield,
  UserMinus,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { 
  getBoardDetails, 
  getBoardSettings, 
  updateBoardSettings, 
  updateBoardMemberRole,
  removeBoardMember,
  deleteBoard,
  type BoardDetails,
  type BoardSettings
} from "@/lib/api";
import { toast } from "sonner";

export default function BoardSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.slug as string;
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: boardDetails, isLoading: boardLoading } = useQuery<BoardDetails>({
    queryKey: ["board-details", boardId],
    queryFn: () => getBoardDetails(boardId),
    enabled: Boolean(boardId && user),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<BoardSettings>({
    queryKey: ["board-settings", boardId],
    queryFn: () => getBoardSettings(boardId),
    enabled: Boolean(boardId && user),
  });

  const currentMembership = boardDetails?.members?.find(
    (m) => m.userId === user?.id
  );
  const isAdmin = currentMembership?.role === "ADMIN";

  const settingsMutation = useMutation({
    mutationFn: (data: { isPublic?: boolean; password?: string | null }) =>
      updateBoardSettings(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-settings", boardId] });
      toast.success("Settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "EDITOR" | "VIEWER" }) =>
      updateBoardMemberRole(boardId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-details", boardId] });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeBoardMember(boardId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-details", boardId] });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoard(boardId),
    onSuccess: () => {
      toast.success("Board deleted");
      router.push("/boards");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete board");
    },
  });

  const handleTogglePublic = () => {
    settingsMutation.mutate({ isPublic: !settings?.isPublic });
  };

  const handleSetPassword = () => {
    if (password.trim()) {
      settingsMutation.mutate({ password: password.trim() });
      setPassword("");
    }
  };

  const handleRemovePassword = () => {
    settingsMutation.mutate({ password: null });
  };

  const handleDeleteBoard = () => {
    if (deleteConfirm === boardDetails?.title) {
      deleteMutation.mutate();
    }
  };

  if (loading || boardLoading || settingsLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!boardDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Board not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push(`/boards/${boardId}`)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to board</span>
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{boardDetails.title}</h1>
            <p className="text-slate-500">Board Settings</p>
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    {settings?.isPublic ? (
                      <Globe className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Visibility</h2>
                    <p className="text-sm text-slate-500">Control who can access this board</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <p className="font-medium text-slate-800">Public Board</p>
                    <p className="text-sm text-slate-500">Anyone with the link can view</p>
                  </div>
                  <button
                    onClick={handleTogglePublic}
                    disabled={settingsMutation.isPending}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      settings?.isPublic ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        settings?.isPublic ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-800">Password Protection</p>
                      <p className="text-sm text-slate-500">Require password to access</p>
                    </div>
                    {settings?.password && (
                      <button
                        onClick={handleRemovePassword}
                        className="text-sm text-red-500 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleSetPassword}
                      disabled={!password.trim() || settingsMutation.isPending}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all"
                    >
                      {settingsMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Set"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                    <p className="text-sm text-slate-500">Manage board members and roles</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {boardDetails.members.map((member) => {
                    const isCurrentUser = member.userId === user.id;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                            {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {member.user.name || member.user.email}
                              {isCurrentUser && <span className="text-slate-400 ml-1.5 text-xs">(You)</span>}
                            </p>
                            <p className="text-sm text-slate-400">{member.user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => {
                              if (!isCurrentUser) {
                                roleMutation.mutate({ 
                                  userId: member.userId, 
                                  role: e.target.value as "ADMIN" | "EDITOR" | "VIEWER" 
                                });
                              }
                            }}
                            disabled={isCurrentUser || roleMutation.isPending}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>

                          {!isCurrentUser && member.role !== "ADMIN" && (
                            <button
                              onClick={() => removeMutation.mutate(member.userId)}
                              disabled={removeMutation.isPending}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Danger Zone</h2>
                    <p className="text-sm text-slate-500">Permanently delete this board</p>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm text-red-800 mb-3">
                    This action cannot be undone. All board data will be permanently deleted.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={`Type "${boardDetails.title}" to confirm`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <button
                      onClick={handleDeleteBoard}
                      disabled={deleteConfirm !== boardDetails.title || deleteMutation.isPending}
                      className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isAdmin && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Access Info</h2>
                  <p className="text-sm text-slate-500">Your role in this board</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-medium">
                  {user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{user.email}</p>
                  <p className="text-sm text-slate-500 capitalize">{currentMembership?.role} Access</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Only board admins can change settings. Contact an admin to request changes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
