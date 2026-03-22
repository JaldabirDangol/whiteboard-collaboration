"use client";

import { useState } from "react";

export const SearchBar = () => {
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