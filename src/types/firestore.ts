import type { Timestamp } from 'firebase/firestore';

export type ResolutionMethod = 'registry' | 'form-discovery' | 'platform-pattern' | 'user-provided';

export type SearchStatus = 'pending' | 'resolving' | 'extracting' | 'complete' | 'failed';

export type SourceStatusDoc = 'PENDING' | 'RESOLVING' | 'RESOLVED' | 'BLOCKED' | 'FAILED';

export interface UserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Per-source progress inside a search, rewritten by the pipeline as it works. */
export interface SourceStateDoc {
  domain: string;
  status: SourceStatusDoc;
  method?: ResolutionMethod;
  reason?: string;
}

export interface SearchDoc {
  id: string;
  userId: string;
  query: string;
  status: SearchStatus;
  sources: SourceStateDoc[];
  resolvedCount?: number;
  /** Search URLs the user pasted for domains resolution could not work out. */
  userSearchUrls?: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** One candidate listing off a results page, scored against the query server-side. */
export interface CandidateDoc {
  title: string;
  url: string;
  price: number;
  currency: string;
  inStock: boolean;
  matchConfidence: number;
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface ListingDoc {
  id: string;
  searchId: string;
  retailerDomain: string;
  url: string;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
  matchConfidence: number;
  /** 1 to 4, what the tile renders. */
  confidenceBadge: 1 | 2 | 3 | 4;
  extractionTier: 1 | 2 | 3 | 4 | 5;
  /** True when confidence fell below the threshold and the user should pick. */
  needsConfirmation: boolean;
  confirmedByUser?: boolean;
  candidates: CandidateDoc[];
  scrapedAt: Timestamp;
}

export interface SavedSearchDoc {
  id: string;
  userId: string;
  query: string;
  sources: string[];
  /** Lowest price across sources at the last check. */
  lowestPrice: number;
  /** Lowest price at the check before, so a drop can be shown against it. */
  previousLowestPrice: number | null;
  sourceCount: number;
  lastCheckedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** One observation of a saved search's lowest price, feeding the history bars. */
export interface PricePointDoc {
  id: string;
  savedSearchId: string;
  price: number;
  observedAt: Timestamp;
}

export interface RetailerTemplateDoc {
  domain: string;
  resolutionMethod: ResolutionMethod;
  searchUrlPattern?: string;
  lastValidatedAt: Timestamp;
  successCount: number;
  failureCount: number;
  confirmedMatchCount?: number;
}
