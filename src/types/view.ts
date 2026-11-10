/**
 * The shapes the screens render. The live Firestore stream is mapped into
 * these, so no view component ever handles a raw Firestore document.
 */

/** KNOWN means the registry already holds a trusted template, before any run. */
export type SourceStatus = 'PENDING' | 'KNOWN' | 'RESOLVING' | 'RESOLVED' | 'BLOCKED' | 'FAILED';

/** One error taxonomy, shared by row state, the alert list and any future push payload. */
export type ErrorKind = 'blocked' | 'no-results' | 'weak-match' | 'timeout';

/** Where a search is up to. Written on every transition; the resume pointer and the tracker's source. */
export type Step = 'sources' | 'scan' | 'confirm' | 'compare';

export interface SourceView {
  domain: string;
  status: SourceStatus;
  reason?: string;
  /** Set when the source needs the user. */
  kind?: ErrorKind;
}

export interface TileView {
  domain: string;
  title: string;
  price: string;
  value: number;
  lowest: boolean;
  /** Confidence fell below the threshold and the user should pick. */
  issue: boolean;
  url: string;
}

export interface CandidateView {
  title: string;
  price: string;
  value: number;
  /** 0 to 1 match confidence, as scored server-side. */
  confidence: number;
  url?: string;
}

export interface SavedItemView {
  id: string;
  name: string;
  value: number;
  sources: number;
  checked: boolean;
  justDropped: boolean;
  lastChecked: string | null;
  wasValue?: number;
}

/** One inbox entry. Errors and price drops share the list. */
export interface AlertView {
  id: string;
  kind: ErrorKind | 'drop';
  domain?: string;
  message: string;
  /** Epoch millis, when known. */
  at: number | null;
}

/** A past or unfinished search, for the home screen. */
export interface SearchSummary {
  id: string;
  query: string;
  step: Step;
  finished: boolean;
  lowest: number | null;
  sources: string[];
  /** Epoch millis the search was created, when the server timestamp has landed. */
  at: number | null;
}
