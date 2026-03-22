"use client";
import Link from "next/link"

export const BoardCard = ({ board }: any) => {
  return (
    <Link href={`/boards/${board.id}`} className="border rounded-xl overflow-hidden hover:shadow cursor-pointer">
      
      {/* Thumbnail */}
      {board.thumbnailUrl ? (
        <img
          src={board.thumbnailUrl}
          alt={board.title}
          className="h-36 w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/fallback.png"; // optional fallback
          }}
        />
      ) : (
        <div className="h-36 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          No Preview
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold truncate">{board.title}</h3>
          <span>{board.isStarred ? "⭐" : ""}</span>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          <p>Last updated: {board.updatedAt || board.lastUpdated}</p>
          <p className="capitalize">Visibility: {board.visibility}</p>
        </div>

        <div className="mt-4 flex justify-end">
          <button className="text-xs text-gray-500 hover:text-black">
            ⋮
          </button>
        </div>
      </div>
    </Link>
  );
};