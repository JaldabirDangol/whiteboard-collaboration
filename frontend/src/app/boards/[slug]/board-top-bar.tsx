import { Cog, HelpCircle, MessageSquareMore, Share2, X, Maximize, Minimize, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AVATAR_COLORS, getInitials } from "./board-profile-utils";
import { useQuery } from "@tanstack/react-query";
import { getBoardActivity, type BoardActivity } from "@/lib/api";
import SnapshotDialog from "./board-snapshot-dialog";

type TopTab = "Files" | "Canvas" | "Export" | "History";

type BoardTopBarProps = {
  boardId: string;
  boardTitle: string;
  isViewOnly: boolean;
  saveStatus: "saved" | "saving";
  topTabs: readonly TopTab[];
  activeTopTab: TopTab;
  onTopTabClick: (tab: TopTab) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
  shareEmail: string;
  onShareEmailChange: (value: string) => void;
  shareRole: "EDITOR" | "VIEWER";
  onShareRoleChange: (value: "EDITOR" | "VIEWER") => void;
  onInviteCollaborator: () => void;
  sharePending: boolean;
  userSuggestions: { id: string; email: string; name?: string | null }[];
  onSelectSuggestion: (email: string) => void;
  shareLink: string;
  onCopyShareLink: () => void;
  exportOpen: boolean;
  onExportOpenChange: (open: boolean) => void;
  onExportImage: () => void;
  onExportSvg?: () => void;
  onExportJson: () => void;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  draftAvatarColor: string;
  draftDisplayName: string;
  onDraftDisplayNameChange: (value: string) => void;
  onDraftAvatarColorChange: (value: string) => void;
  userEmail?: string;
  userLabel: string;
  onSaveSettings: () => void;
  helpOpen: boolean;
  onHelpOpenChange: (open: boolean) => void;
  avatarColor: string;
  avatarInitials: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
};

export default function BoardTopBar({
  boardId,
  boardTitle,
  isViewOnly,
  saveStatus,
  topTabs,
  activeTopTab,
  onTopTabClick,
  chatOpen,
  onToggleChat,
  shareOpen,
  onShareOpenChange,
  shareEmail,
  onShareEmailChange,
  shareRole,
  onShareRoleChange,
  onInviteCollaborator,
  sharePending,
  userSuggestions,
  onSelectSuggestion,
  shareLink,
  onCopyShareLink,
  exportOpen,
  onExportOpenChange,
  onExportImage,
  onExportSvg,
  onExportJson,
  historyOpen,
  onHistoryOpenChange,
  onUndo,
  onRedo,
  settingsOpen,
  onSettingsOpenChange,
  onOpenSettings,
  draftAvatarColor,
  draftDisplayName,
  onDraftDisplayNameChange,
  onDraftAvatarColorChange,
  userEmail,
  userLabel,
  onSaveSettings,
  helpOpen,
  onHelpOpenChange,
  avatarColor,
  avatarInitials,
  isFullscreen,
  onToggleFullscreen,
  showGrid,
  onToggleGrid,
}: BoardTopBarProps) {
  const { data: activityData } = useQuery({
    queryKey: ["board-activity-history", boardId],
    queryFn: () => getBoardActivity(boardId),
    enabled: Boolean(boardId && historyOpen),
    staleTime: 10_000,
  });

  const historyEntries = activityData ?? [];

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      "board:undo": "Undo",
      "board:redo": "Redo",
      "object.created": "Created shape",
      "object.updated": "Updated shape",
      "object.deleted": "Deleted shape",
    };
    return map[action] || action;
  };

  return (
    <div className="z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <p className="truncate text-sm font-semibold text-slate-900">{boardTitle}</p>
        <span
          className={`hidden items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide md:inline-flex ${
            isViewOnly
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
          }`}
          title={isViewOnly ? "You can view but cannot edit this board" : "You can edit this board"}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${isViewOnly ? "bg-amber-500" : "bg-emerald-500"}`} />
          {isViewOnly ? "View only" : "Can edit"}
        </span>
        <span className="hidden items-center gap-1 text-[11px] text-slate-400 md:inline-flex">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          {saveStatus === "saving" ? "Saving..." : "Saved"}
        </span>
        <div className="hidden items-center gap-4 text-sm md:flex">
          {topTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTopTabClick(tab)}
              className={`pb-1 transition-all ${
                tab === activeTopTab
                  ? "border-b-2 border-indigo-600 font-medium text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleGrid}
          className={`hidden h-8 w-8 items-center justify-center rounded-lg transition-colors md:flex ${
            showGrid ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors md:flex"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>

        <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={onToggleChat}>
          {chatOpen ? <X className="h-4 w-4" /> : <MessageSquareMore className="h-4 w-4" />}
        </Button>

        <Dialog open={shareOpen} onOpenChange={onShareOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-500/20">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Board</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Invite a collaborator by email</p>
                <div className="relative">
                  <input
                    value={shareEmail}
                    onChange={(event) => onShareEmailChange(event.target.value)}
                    type="email"
                    placeholder="Search by email..."
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {userSuggestions.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      {userSuggestions.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors"
                            onClick={() => onSelectSuggestion(u.email)}
                          >
                            <span className="font-medium text-slate-800">{u.name || u.email.split("@")[0]}</span>
                            <span className="text-slate-400">{u.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <select
                  value={shareRole}
                  onChange={(event) => onShareRoleChange(event.target.value as "EDITOR" | "VIEWER")}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <Button className="w-full" onClick={onInviteCollaborator} disabled={sharePending}>
                  {sharePending ? "Sharing..." : "Invite collaborator"}
                </Button>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">Share link</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 break-all select-all">
                  {shareLink}
                </div>
                <Button variant="secondary" className="w-full" onClick={onCopyShareLink}>
                  Copy link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={exportOpen} onOpenChange={onExportOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export board</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Button type="button" className="w-full" onClick={onExportImage}>
                Download PNG
              </Button>
              {onExportSvg && (
                <Button type="button" variant="outline" className="w-full" onClick={onExportSvg}>
                  Download SVG
                </Button>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={onExportJson}>
                Download JSON
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={historyOpen} onOpenChange={onHistoryOpenChange}>
          <DialogContent className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onUndo}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Undo
                </Button>
                <Button type="button" variant="outline" onClick={onRedo}>
                  <RotateCw className="h-4 w-4 mr-1" /> Redo
                </Button>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 space-y-1">
                <p><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">Ctrl/Cmd + Z</kbd> Undo</p>
                <p><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">Ctrl/Cmd + Shift + Z</kbd> Redo</p>
              </div>
              {historyEntries.length > 0 && (
                <div className="max-h-60 overflow-auto space-y-1 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recent activity</p>
                  {historyEntries.slice(0, 20).map((entry: BoardActivity) => (
                    <div key={entry.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-slate-700">{formatAction(entry.action)}</span>
                      <span className="text-slate-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <SnapshotDialog boardId={boardId} />

        <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:inline-flex"
          >
            <Cog className="h-4 w-4" />
          </button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile & avatar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div
                  className="grid h-14 w-14 place-items-center rounded-full text-lg font-semibold text-white shadow-inner"
                  style={{ backgroundColor: draftAvatarColor }}
                >
                  {getInitials(draftDisplayName.trim() || userEmail || "Me")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{draftDisplayName.trim() || userLabel}</p>
                  <p className="text-xs text-slate-400">{userEmail}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
                  Display name
                </label>
                <input
                  id="displayName"
                  value={draftDisplayName}
                  onChange={(event) => onDraftDisplayNameChange(event.target.value)}
                  placeholder="Your name"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Avatar color</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => onDraftAvatarColorChange(swatch)}
                      className={`h-8 w-8 rounded-full ring-offset-2 transition hover:scale-110 ${
                        draftAvatarColor === swatch ? "ring-2 ring-slate-500 scale-110" : "ring-1 ring-slate-200"
                      }`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Use avatar color ${swatch}`}
                    />
                  ))}
                </div>
              </div>

              <Button type="button" className="w-full" onClick={onSaveSettings}>
                Save settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={helpOpen} onOpenChange={onHelpOpenChange}>
          <DialogTrigger asChild>
            <button type="button" className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Canvas shortcuts</DialogTitle>
            </DialogHeader>
            <div className="rounded-xl bg-slate-50 p-4">
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono min-w-[8rem] text-center">Space + Drag</kbd>
                  Pan canvas
                </li>
                <li className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono min-w-[8rem] text-center">Ctrl/Cmd + Wheel</kbd>
                  Zoom
                </li>
                <li className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono min-w-[8rem] text-center">Ctrl/Cmd + Z</kbd>
                  Undo
                </li>
                <li className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono min-w-[8rem] text-center">Ctrl/Cmd + Shift + Z</kbd>
                  Redo
                </li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm md:flex hover:opacity-90 transition-opacity"
          style={{ backgroundColor: avatarColor }}
          title={userLabel}
        >
          {avatarInitials}
        </button>
      </div>
    </div>
  );
}
