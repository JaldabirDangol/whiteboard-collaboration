import { create } from "zustand";
import { getMe } from "@/lib/api";

export type User = {
	id: string;
	email: string;
};

type UserStoreType = {
	user: User | null;
	loading: boolean;
	setUser: (user: User | null) => void;
	clearUser: () => void;
	setLoading: (loading: boolean) => void;
	fetchCurrentUser: () => Promise<void>;
};

export const useUserStore = create<UserStoreType>((set) => ({
	user: null,
	loading: true,
	setUser: (user) => set({ user }),
	clearUser: () => set({ user: null }),
	setLoading: (loading) => set({ loading }),
	fetchCurrentUser: async () => {
		set({ loading: true });
		try {
			const data = await getMe();
			set({ user: data?.user ?? null });
		} finally {
			set({ loading: false });
		}
	},
}));