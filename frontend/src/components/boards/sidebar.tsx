"use client";

export const BoardSidebar = () => {
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
