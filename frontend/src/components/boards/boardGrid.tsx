"use client";

import { BoardCard } from "./boardCard";

 export const BoardGrid = ({ boards }: any) => {
 if (!boards.length) {
  return (
    <div className="flex flex-col items-center justify-center mt-24 text-center">
      
      {/* Icon / Visual */}
      <div className="text-5xl mb-4">📋</div>

      {/* Title */}
      <h2 className="text-xl font-semibold mb-2">
        No boards yet
      </h2>

      {/* Description */}
      <p className="text-gray-500 mb-6 max-w-sm">
        Create your first board to start collaborating, sketching ideas,
        and organizing your work.
      </p>

      {/* CTA */}
      <button
        onClick={() => {/* open create modal */}}
        className="bg-black text-white px-5 py-2.5 rounded-md hover:bg-gray-800 transition"
      >
        + Create Board
      </button>
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
