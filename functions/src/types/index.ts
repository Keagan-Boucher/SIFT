export type ResolutionMethod = "registry" | "form-discovery" | "platform-pattern" | "user-provided";

export interface ResolutionResult {
  method: ResolutionMethod;
  listingUrl: string;
  confidence: number;
}

export type ExtractionTier = 1 | 2 | 3 | 4;

export interface ExtractionResult {
  tier: ExtractionTier;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
}
