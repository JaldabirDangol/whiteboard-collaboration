import { Cog, HelpCircle, MessageSquareMore, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AVATAR_COLORS, getInitials } from "./board-profile-utils";

type TopTab = "Files" | "Canvas" | "Export" | "History";

type BoardTopBarProps = {
  boardTitle: string;
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
  shareLink: string;
  onCopyShareLink: () => void;
  exportOpen: boolean;
  onExportOpenChange: (open: boolean) => void;
  onExportImage: () => void;
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
};

export default function BoardTopBar({
  boardTitle,
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
  shareLink,
  onCopyShareLink,
  exportOpen,
  onExportOpenChange,
  onExportImage,
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
}: BoardTopBarProps) {
  return (
    <div className="z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <p className="truncate text-sm font-semibold text-slate-900">{boardTitle}</p>
        <div className="hidden items-center gap-4 text-sm md:flex">
          {topTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTopTabClick(tab)}
              className={`pb-1 transition ${
                tab === activeTopTab
                  ? "border-b-2 border-indigo-600 font-medium text-indigo-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={onToggleChat}>
          {chatOpen ? <X className="h-4 w-4" /> : <MessageSquareMore className="h-4 w-4" />}
        </Button>

        <Dialog open={shareOpen} onOpenChange={onShareOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500">
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
                <input
                  value={shareEmail}
                  onChange={(event) => onShareEmailChange(event.target.value)}
                  type="email"
                  placeholder="teammate@example.com"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
                <select
                  value={shareRole}
                  onChange={(event) => onShareRoleChange(event.target.value as "EDITOR" | "VIEWER")}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <Button className="w-full" onClick={onInviteCollaborator} disabled={sharePending}>
                  {sharePending ? "Sharing..." : "Invite collaborator"}
                </Button>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-sm text-slate-600">Share link</p>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 break-all">
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
              <Button type="button" variant="outline" className="w-full" onClick={onExportJson}>
                Download JSON
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={historyOpen} onOpenChange={onHistoryOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Use undo/redo controls or keyboard shortcuts.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onUndo}>
                  Undo
                </Button>
                <Button type="button" variant="outline" onClick={onRedo}>
                  Redo
                </Button>
              </div>
              <p className="text-xs text-slate-500">Shortcuts: Ctrl/Cmd + Z for undo, Ctrl/Cmd + Shift + Z for redo.</p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:inline-flex"
          >
            <Cog className="h-4 w-4" />
          </button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile & avatar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: draftAvatarColor }}
                >
                  {getInitials(draftDisplayName.trim() || userEmail || "Me")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{draftDisplayName.trim() || userLabel}</p>
                  <p className="text-xs text-slate-500">{userEmail}</p>
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
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                      className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                        draftAvatarColor === swatch ? "ring-2 ring-slate-500" : "ring-1 ring-slate-200"
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
            <button type="button" className="hidden rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Canvas shortcuts</DialogTitle>
            </DialogHeader>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Hold Space and drag to pan.</li>
              <li>Ctrl/Cmd + wheel to zoom.</li>
              <li>Ctrl/Cmd + Z to undo.</li>
              <li>Ctrl/Cmd + Shift + Z to redo.</li>
            </ul>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white md:flex"
          style={{ backgroundColor: avatarColor }}
          title={userLabel}
        >
          {avatarInitials}
        </button>
      </div>
    </div>
  );
}
