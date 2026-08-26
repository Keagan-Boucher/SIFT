import type { CandidateView, NoteView, RecentView, SavedItemView, SourceView, TileView } from '@/types/view';

/**
 * What a screen needs from whatever is behind it. The seeded demo dataset and
 * the live Firestore pipeline both satisfy this, so no view component knows
 * which one it is running on.
 */
export interface SiftSession {
  /** Set in live mode when the backend refuses or a listener fails. */
  error: string | null;

  sources: SourceView[];
  tiles: TileView[];
  saved: SavedItemView[];
  recents: RecentView[];
  /** Candidates for the source currently being confirmed. */
  candidates: CandidateView[];
  /** Notes raised by the backend: blocked sources, low-confidence matches, drops. */
  notes: NoteView[];
  /** Search URLs staged for FAILED sources via provideSearchUrl, keyed by domain, waiting on the next runSearch. */
  stagedUrls: Record<string, string>;
  /** Lowest price per check for the watched search, oldest first. */
  history: number[];

  running: boolean;
  complete: boolean;

  addSource: (domain: string) => void;
  removeSource: (domain: string) => void;
  resetSources: () => void;
  runSearch: (query: string) => void;
  /**
   * Method D: stages a search URL pasted for one domain resolution could not
   * work out on its own. Several can be staged before the next runSearch
   * picks them all up together.
   */
  provideSearchUrl: (domain: string, url: string) => void;
  cancelSearch: () => void;
  /** Opens the confirm step for one source, loading its candidates. */
  beginConfirm: (domain: string) => void;
  confirmCandidate: (index: number) => void;
  /** Nothing this source returned matched: drop its result from the run, leaving every other source alone. */
  discardConfirmSource: () => void;
  saveCurrentSearch: (query: string) => void;
  checkSaved: (savedId: string) => void;
  checkAllSaved: () => void;
}
