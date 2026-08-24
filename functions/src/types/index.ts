export type ResolutionMethod = "registry" | "form-discovery" | "platform-pattern" | "user-provided";

export interface ResolutionResult {
  method: ResolutionMethod;
  listingUrl: string;
  confidence: number;
  /**
   * The `{query}` URL template this resolution came from. Present whenever the
   * method discovered something worth writing back to the registry, so a site
   * solved once is solved for everyone after. Absent for registry hits, which
   * are already stored.
   */
  searchUrlPattern?: string;
  /** Set when robots.txt refused the request. The UI marks the source BLOCKED. */
  blocked?: boolean;
}

export type ExtractionTier = 1 | 2 | 3 | 4;

export interface ExtractionResult {
  tier: ExtractionTier;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
}

/** One candidate listing scored against the user's query. */
export interface ScoredCandidate extends ExtractionResult {
  url: string;
  matchConfidence: number;
}
