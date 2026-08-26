/**
 * The shapes the screens render. The live Firestore stream is mapped into
 * these, so no view component ever handles a raw Firestore document.
 */

import type { SourceStatus } from '@/components/sift/SourceChip';

export interface SourceView {
  domain: string;
  status: SourceStatus;
  /** Why a source is BLOCKED or failed, surfaced in the alert log. */
  reason?: string;
}

export interface TileView {
  retailer: string;
  domain: string;
  tier: 1 | 2 | 3 | 4 | 5;
  /** 1 to 4 badge, derived from match confidence. */
  confidence: number;
  price: string;
  value: number;
  lowest?: boolean;
  /** How many candidates this source returned, shown when a match is unconfirmed. */
  count?: number;
  /** True when confidence fell below the confirm threshold. */
  issue?: boolean;
  title: string;
  url: string;
  method: string;
  stock: string;
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
  dropTo: number | null;
  checked: boolean;
  justDropped: boolean;
  lastChecked: string | null;
  wasValue?: number;
}

export interface NoteView {
  id: string;
  kind: 'block' | 'prompt' | 'drop';
  domain?: string;
  heading: string;
  body: string;
  /** True for a FAILED (not BLOCKED) source: pasting its search URL directly could fix it. */
  retryable?: boolean;
}

export interface RecentView {
  /** Search document id. The same query can be run any number of times, so the name is not a key. */
  id: string;
  name: string;
  meta: string;
  /** Domains that run used, so tapping it can stage them again. */
  sources: string[];
}
