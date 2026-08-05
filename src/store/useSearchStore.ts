import { create } from "zustand";
import type { ListingDoc } from "@/types/firestore";

interface SearchState {
  activeSearchId: string | null;
  listings: ListingDoc[];
  setActiveSearch: (searchId: string | null) => void;
  setListings: (listings: ListingDoc[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  activeSearchId: null,
  listings: [],
  setActiveSearch: (searchId) => set({ activeSearchId: searchId }),
  setListings: (listings) => set({ listings }),
}));
