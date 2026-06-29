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
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              {rightPanelTab === "activity" ? (
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1 capitalize">{rightPanelTab}</p>
            <p className="text-xs text-slate-400">
              {rightPanelTab === "activity" ? "Activity feed will appear here." : "Comments panel will appear here."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
