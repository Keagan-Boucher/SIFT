import { create } from 'zustand';

export type Screen =
  | 'home'
  | 'sources'
  | 'presets'
  | 'live'
  | 'confirm'
  | 'fix'
  | 'compare'
  | 'alerts'
  | 'saved'
  | 'account';

/**
 * UI state only. Sources, listings, saved searches and alerts live in
 * Firestore and reach the screens through the session hook, so nothing the
 * backend owns is duplicated here.
 */
interface FlowState {
  screen: Screen;
  query: string;
  /** The own-URL field on the new search screen. Null while it is closed. */
  ownUrl: string | null;
  /** "Show N more" on the suggested sites. */
  allSuggestions: boolean;
  /** Once the user has added or removed a site, suggestions stop replacing their picks. */
  sourcesTouched: boolean;
  /** The source whose search URL is being pasted, and what has been typed so far. */
  fixDomain: string | null;
  fixUrl: string;
  /** Candidate picked on the confirm screen, if any. */
  chosen: number | null;
  presetCategory: string | null;
  /** Alert ids the user has seen or acted on. */
  read: string[];
}

interface FlowStore extends FlowState {
  patch: (next: Partial<FlowState>) => void;
  /** Tapping the open category closes it again, so only one is ever open. */
  openCategory: (id: string) => void;
}

export const useFlowStore = create<FlowStore>((set) => ({
  screen: 'home',
  query: '',
  ownUrl: null,
  allSuggestions: false,
  sourcesTouched: false,
  fixDomain: null,
  fixUrl: '',
  chosen: null,
  presetCategory: null,
  read: [],

  patch: (next) => set(next),
  openCategory: (id) => set((s) => ({ presetCategory: s.presetCategory === id ? null : id })),
}));
