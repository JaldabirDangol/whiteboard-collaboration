export const AVATAR_COLORS = ["#4f46e5", "#0284c7", "#0f766e", "#ca8a04", "#c2410c", "#be123c"];

export type StoredProfile = {
  displayName: string;
  avatarColor: string;
};

export const getInitials = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return "ME";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

export const getStoredProfile = (profileStorageKey: string | null): StoredProfile => {
  if (typeof window === "undefined" || !profileStorageKey) {
    return { displayName: "", avatarColor: AVATAR_COLORS[0] };
  }

  try {
    const raw = localStorage.getItem(profileStorageKey);
    if (!raw) {
      return { displayName: "", avatarColor: AVATAR_COLORS[0] };
    }

    const parsed = JSON.parse(raw) as { displayName?: string; avatarColor?: string };
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      avatarColor:
        typeof parsed.avatarColor === "string" && AVATAR_COLORS.includes(parsed.avatarColor)
          ? parsed.avatarColor
          : AVATAR_COLORS[0],
    };
  } catch {
    return { displayName: "", avatarColor: AVATAR_COLORS[0] };
  }
};
