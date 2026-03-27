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
    <aside className="hidden h-full w-80 border-l border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Team</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Online Now</span>
        </div>
        <div className="flex items-center gap-2">
          {(members.length ? members : [{ id: "you", initials: "YO", label: "You", role: "ADMIN" }]).slice(0, 4).map((member) => (
            <div
              key={member.id}
              title={member.label}
              className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-2 ring-white"
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

      <div className="border-b border-slate-200 px-2 pt-2">
        <div className="grid grid-cols-3 gap-1 text-xs">
          {(["activity", "chat", "comments"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onRightPanelTabChange(tab)}
              className={`rounded-md px-2 py-2 capitalize transition ${
                rightPanelTab === tab
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[calc(100%-125px)]">
        {rightPanelTab === "chat" ? (
          <Chat boardId={boardId} currentUserId={currentUserId} showHeader={false} className="h-full border-r-0 bg-white" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            {rightPanelTab === "activity" ? "Activity feed will appear here." : "Comments panel will appear here."}
          </div>
        )}
      </div>
    </aside>
  );
}
