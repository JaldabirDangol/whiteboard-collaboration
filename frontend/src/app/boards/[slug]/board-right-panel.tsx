import Chat from "@/components/canvas/chat";

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
};

export default function BoardRightPanel({
  members,
  rightPanelTab,
  onRightPanelTabChange,
  boardId,
  currentUserId,
}: BoardRightPanelProps) {
  return (
    <aside className="hidden h-full w-80 border-l border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Team</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Online Now
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(members.length ? members : [{ id: "you", initials: "YO", label: "You", role: "ADMIN" }]).slice(0, 4).map((member) => (
            <div
              key={member.id}
              title={member.label}
              className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-2 ring-white shadow-sm"
            >
              {member.initials}
            </div>
          ))}
          {(members.length ? members.length : 1) > 4 ? (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
              +{(members.length ? members.length : 1) - 4}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-200 px-3 py-2">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50 p-1 text-xs">
          {(["activity", "chat", "comments"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onRightPanelTabChange(tab)}
              className={`rounded-md px-2 py-1.5 capitalize transition ${
                rightPanelTab === tab
                  ? "bg-white font-medium text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-slate-700"
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
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            {rightPanelTab === "activity" ? "Activity feed will appear here." : "Comments panel will appear here."}
          </div>
        )}
      </div>
    </aside>
  );
}
