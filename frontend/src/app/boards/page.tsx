// app/boards/page.tsx

"use client";
import { useState } from "react";

const mockBoards = [
  {
    id: "1",
    title: "System Design",
    isStarred: true,
    lastUpdated: "2h ago",
    visibility: "private",
  },
  {
    id: "2",
    title: "Whiteboard Ideas",
    isStarred: false,
    lastUpdated: "1d ago",
    visibility: "shared",
  },
];

export default function BoardsPage() {
  return (
    <div className="flex h-screen">
      <BoardSidebar />

      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <SearchBar />
          <CreateBoardButton />
        </div>

        <BoardGrid boards={mockBoards} />
      </div>
    </div>
  );
}

// components/BoardSidebar.tsx
function BoardSidebar() {
  return (
    <div className="w-64 border-r p-4 space-y-4">
      <h2 className="text-lg font-semibold">Boards</h2>
      <ul className="space-y-2 text-sm">
        <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">All Boards</li>
        <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">⭐ Starred</li>
        <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">🧑‍🤝‍🧑 Shared</li>
        <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">🕒 Recent</li>
      </ul>
    </div>
  );
}


 function SearchBar() {
  const [value, setValue] = useState("");

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search boards..."
      className="border px-4 py-2 rounded w-80"
    />
  );
}

 function CreateBoardButton() {
  return (
    <button className="bg-black text-white px-4 py-2 rounded">
      + Create Board
    </button>
  );
}
 function BoardGrid({ boards }: any) {
  if (!boards.length) {
    return (
      <div className="text-center mt-20">
        <p className="text-gray-500">No boards found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {boards.map((board: any) => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  );
}


 function BoardCard({ board }: any) {
  return (
    <div className="border rounded-xl p-4 hover:shadow cursor-pointer">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{board.title}</h3>
        <span>{board.isStarred ? "⭐" : ""}</span>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Last updated: {board.lastUpdated}</p>
        <p>Visibility: {board.visibility}</p>
      </div>

      <div className="mt-4 flex justify-end">
        <button className="text-xs text-gray-500 hover:text-black">
          ⋮
        </button>
      </div>
    </div>
  );
}
