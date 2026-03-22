"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export const BoardCard = ({ board }: any) => {
  // Check if the URL is valid (starts with / or http)
  const isValidUrl = board?.thumbnailUrl?.startsWith("/") || board?.thumbnailUrl?.startsWith("http");
  
  // Use the valid URL or null
  const [imgSrc, setImgSrc] = useState(isValidUrl ? board.thumbnailUrl : null);

  // Sync state if board prop changes
  useEffect(() => {
    setImgSrc(isValidUrl ? board.thumbnailUrl : null);
  }, [board?.thumbnailUrl, isValidUrl]);

  return (
    <Link href={`/boards/${board.id}`} className="group border rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer bg-white block">
      
      {/* Thumbnail Container */}
      <div className="relative h-36 w-full bg-gray-100">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={board.title || "Board thumbnail"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImgSrc("/fallback.png")}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-2xl mb-1">🖼️</span>
            <span className="text-xs font-medium">No Preview</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold truncate text-gray-800">{board.title}</h3>
          <span>{board.isStarred ? "⭐" : ""}</span>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <p>Last updated: {board.updatedAt || "Just now"}</p>
        </div>
      </div>
    </Link>
  );
};