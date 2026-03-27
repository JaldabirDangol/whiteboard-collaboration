import Chat from "@/components/canvas/chat";

type BoardMobileChatProps = {
  boardId: string;
  currentUserId?: string;
  chatOpen: boolean;
  onClose: () => void;
};

export default function BoardMobileChat({ boardId, currentUserId, chatOpen, onClose }: BoardMobileChatProps) {
  return (
    <>
      <div
        className={`absolute inset-0 z-20 bg-slate-900/25 transition-opacity duration-200 lg:hidden ${
          chatOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute inset-y-0 right-0 z-30 w-[min(22rem,92vw)] border-l border-slate-200 bg-white transition-transform duration-200 lg:hidden ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Chat
          boardId={boardId}
          currentUserId={currentUserId}
          showMobileClose
          onClose={onClose}
          className="h-full border-r-0 bg-white"
        />
      </div>
    </>
  );
}
