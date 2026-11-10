import type { AlertView, CandidateView, SavedItemView, SearchSummary, SourceView, Step, TileView } from '@/types/view';

/**
 * What a screen needs from whatever is behind it. The live Firestore pipeline
 * satisfies this, and the boundary is what keeps the view components ignorant
 * of Firestore.
 */
export interface SiftSession {
  /** Set when the backend refuses or a listener fails. */
  error: string | null;

  /** The search on screen, if one has been started or resumed. */
  searchId: string | null;
  sources: SourceView[];
  tiles: TileView[];
  saved: SavedItemView[];
  /** The user's searches, newest first, one per query. */
  searches: SearchSummary[];
  /** Candidates for the source currently being confirmed. */
  candidates: CandidateView[];
  confirmDomain: string | null;
  /** Sources that need the user, and watched prices that dropped. */
  alerts: AlertView[];

  running: boolean;
  complete: boolean;

  addSource: (domain: string) => void;
  removeSource: (domain: string) => void;
  /** Replaces the staged set, for pre-selected recommendations. */
  setSources: (domains: string[]) => void;
  /** Drops staged sources and detaches from the current search. The search itself carries on server-side. */
  resetSources: () => void;
  runSearch: (query: string) => void;
  /** Re-runs with a search URL pasted for one domain resolution could not work out. */
  retryWithUrl: (query: string, domain: string, url: string) => void;
  /** Re-attaches to a search from an earlier visit. Listeners rehydrate everything else. */
  resumeSearch: (search: SearchSummary) => void;
  /** Takes one source out of this run and the staged set. */
  dropSource: (domain: string) => void;
  /** Opens the confirm step for one source, loading its candidates. */
  beginConfirm: (domain: string) => void;
  confirmCandidate: (index: number) => void;
  /** Nothing this source returned matched: drop its result from the run, leaving every other source alone. */
  discardConfirmSource: () => void;
  saveCurrentSearch: (query: string) => void;
  checkSaved: (savedId: string) => void;
  checkAllSaved: () => void;
  /** Moves the resume pointer on the current search. */
  setStep: (step: Step) => void;
}
