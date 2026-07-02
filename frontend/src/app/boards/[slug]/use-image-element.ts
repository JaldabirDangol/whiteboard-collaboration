"use client";

import { useEffect, useState } from "react";

export function useImageElement(url: string): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { if (!cancelled) setLoaded(img); };
    img.onerror = () => { if (!cancelled) setLoaded(null); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);

  return loaded;
}
