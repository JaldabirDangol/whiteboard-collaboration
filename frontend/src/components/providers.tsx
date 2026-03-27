"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    void fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}