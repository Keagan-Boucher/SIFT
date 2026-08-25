import { create } from 'zustand';

import { DEFAULT_QUERY } from '@/constants/sift-mock-data';
import type { NoteView } from '@/types/view';

export type Screen = 'sources' | 'live' | 'confirm' | 'results' | 'dashboard' | 'saved';

/** A note the user dismissed, kept for the session so it can be read back. */
export interface ArchiveEntry extends NoteView {
  stamp: string;
}

/**
 * UI state only. Sources, listings, saved searches, notes and history all live
 * in Firestore and reach the screens through the session hooks, so nothing the
 * backend owns is duplicated here.
 */
interface FlowStore {
  screen: Screen;
  /** The domain being typed into the add-source field. */
  input: string;
  query: string;
  showArchive: boolean;
  showAccount: boolean;
  /** Domain of the FAILED source whose "paste a search URL" popup is open, if any. */
  retryDomain: string | null;
  /** Index of the candidate selected in the confirm step. */
  chosen: number;
  /** Index of the tile whose detail popup is open. */
  selected: number | null;
  dismissed: ArchiveEntry[];

  setScreen: (screen: Screen) => void;
  setInput: (input: string) => void;
  setQuery: (query: string) => void;
  toggleArchive: () => void;
  toggleAccount: () => void;
  openRetry: (domain: string) => void;
  closeRetry: () => void;
  choose: (index: number) => void;
  select: (index: number | null) => void;
  archive: (note: NoteView, stamp: string) => void;
  clearArchive: () => void;
}

export const useFlowStore = create<FlowStore>((set) => ({
  screen: 'sources',
  input: '',
  query: DEFAULT_QUERY,
  showArchive: false,
  showAccount: false,
  retryDomain: null,
  chosen: 0,
  selected: null,
  dismissed: [],

  setScreen: (screen) => set({ screen }),
  setInput: (input) => set({ input }),
  setQuery: (query) => set({ query }),
  // All three share a corner, so opening one closes the others.
  toggleArchive: () => set((s) => ({ showArchive: !s.showArchive, showAccount: false, retryDomain: null })),
  toggleAccount: () => set((s) => ({ showAccount: !s.showAccount, showArchive: false, retryDomain: null })),
  openRetry: (domain) => set({ retryDomain: domain, showArchive: false, showAccount: false }),
  closeRetry: () => set({ retryDomain: null }),
  choose: (chosen) => set({ chosen }),
  select: (selected) => set({ selected }),
  archive: (note, stamp) =>
    set((s) =>
      s.dismissed.some((entry) => entry.id === note.id)
        ? s
        : { dismissed: [{ ...note, stamp }, ...s.dismissed] },
    ),
  clearArchive: () => set({ dismissed: [] }),
}));
