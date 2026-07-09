import Chat from "@/components/canvas/chat";
import ShapeComments from "@/components/canvas/shape-comments";

type BoardMemberSummary = {
  id: string;
  label: string;
  initials: string;
  role: string;
};

type BoardRightPanelProps = {
  members: BoardMemberSummary[];
  rightPanelTab: "chat" | "comments" | null;
  onRightPanelTabChange: (tab: "chat" | "comments" | null) => void;
  boardId: string;
  currentUserId?: string;
  selectedShapeId?: string | null;
  shapeTypeMap?: Record<string, string>;
  onlineUserIds?: Set<string>;
  onGoToUser?: (userId: string) => void;
  followUserId?: string | null;
  onFollowUser?: (userId: string | null) => void;
};

export default function BoardRightPanel({
  members,
  rightPanelTab,
  onRightPanelTabChange,
  boardId,
  currentUserId,
  selectedShapeId,
  shapeTypeMap,
  onlineUserIds,
  onGoToUser,
  followUserId,
  onFollowUser,
}: BoardRightPanelProps) {
  const displayMembers = members.length ? members : [{ id: "you", initials: "YO", label: "You", role: "ADMIN" }];
  const onlineCount = onlineUserIds?.size ?? 0;

  return (
    <aside className={`h-full w-80 border-l border-slate-200 bg-white ${
      rightPanelTab ? "hidden lg:flex lg:flex-col" : "hidden"
    }`}>
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-900">Team</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlineCount} online
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {displayMembers.map((member) => {
            const isOnline = onlineUserIds?.has(member.id) ?? false;
            const isFollowed = followUserId === member.id;
            return (
              <div key={member.id} className="relative group">
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => onGoToUser?.(member.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (isOnline) onFollowUser?.(isFollowed ? null : member.id);
                  }}
                  className={`relative block rounded-full transition ${
                    isOnline                     ? "cursor-pointer hover:ring-2 hover:ring-accent" : "cursor-default"
                  } ${isFollowed ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                  title={`${member.label} (${member.role})${isOnline ? " — Online" : ""}${
                    isFollowed ? " [Following]" : isOnline ? " — Click to go to, right-click to follow" : ""
                  }`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-white shadow-sm">
                    {member.initials}
                  </div>
                  {isOnline && (
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                      isFollowed ? "bg-amber-400" : "bg-emerald-500"
                    }`} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {followUserId && (
          <button
            type="button"
            onClick={() => onFollowUser?.(null)}
            className="mt-2 w-full rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200/70 hover:bg-amber-100 transition"
          >
            Stop following
          </button>
        )}
      </div>

      <div className="border-b border-slate-100 px-3 py-2.5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1 text-xs">
          {(["chat", "comments"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onRightPanelTabChange(rightPanelTab === tab ? null : tab)}
              className={`rounded-lg px-2 py-1.5 capitalize font-medium transition-all text-black `}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {rightPanelTab === "chat" ? (
          <Chat boardId={boardId} currentUserId={currentUserId} showHeader={false} className="h-full min-h-0 border-r-0 bg-white" />
        ) : rightPanelTab === "comments" ? (
          <ShapeComments
            boardId={boardId}
            currentUserId={currentUserId}
            shapeId={selectedShapeId}
            shapeTypeMap={shapeTypeMap}
            className="h-full min-h-0"
          />
        ) : null}
      </div>
    </aside>
  );
}
