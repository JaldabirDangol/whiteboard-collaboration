import Chat from "@/components/canvas/chat";
import ShapeComments from "@/components/canvas/shape-comments";
import ActivityFeed from "@/components/canvas/activity-feed";

type BoardMemberSummary = {
  id: string;
  label: string;
  initials: string;
  role: string;
};

type BoardRightPanelProps = {
  members: BoardMemberSummary[];
  rightPanelTab: "activity" | "chat" | "comments";
  onRightPanelTabChange: (tab: "activity" | "chat" | "comments") => void;
  boardId: string;
  currentUserId?: string;
  selectedShapeId?: string | null;
  shapeTypeMap?: Record<string, string>;
};

export default function BoardRightPanel({
  members,
  rightPanelTab,
  onRightPanelTabChange,
  boardId,
  currentUserId,
  selectedShapeId,
  shapeTypeMap,
}: BoardRightPanelProps) {
  const displayMembers = members.length ? members : [{ id: "you", initials: "YO", label: "You", role: "ADMIN" }];

  return (
    <aside className="hidden h-full w-80 border-l border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-900">Team</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>
        <div className="flex items-center -space-x-2">
          {displayMembers.slice(0, 5).map((member) => (
            <div
              key={member.id}
              title={`${member.label} (${member.role})`}
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[11px] font-semibold text-white ring-2 ring-white shadow-sm"
            >
              {member.initials}
            </div>
          ))}
          {displayMembers.length > 5 ? (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white">
              +{displayMembers.length - 5}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-100 px-3 py-2.5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1 text-xs">
          {(["activity", "chat", "comments"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onRightPanelTabChange(tab)}
              className={`rounded-lg px-2 py-1.5 capitalize font-medium transition-all ${
                rightPanelTab === tab
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
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
        ) : rightPanelTab === "activity" ? (
          <ActivityFeed
            boardId={boardId}
            currentUserId={currentUserId}
            userNames={Object.fromEntries(members.map((m) => [m.id, m.label]))}
          />
        ) : null}
      </div>
    </aside>
  );
}
