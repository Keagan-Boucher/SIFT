import type { ExtractionResult } from "../types";

/**
 * Tier 1: official retailer API. Future Consideration — needs per-retailer
 * developer registration and API key management, which does not scale
 * to an arbitrary-site promise.
 */
export async function extractFromOfficialApi(_domain: string, _listingUrl: string): Promise<ExtractionResult | null> {
  return null;
}
