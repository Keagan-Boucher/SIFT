import type { ExtractionResult } from "../types";

/**
 * Tier 2: undocumented internal JSON endpoint (e.g. a storefront's
 * /products/{handle}.json). Future Consideration — per-retailer discovery
 * work with no guarantee the endpoint stays stable.
 */
export async function extractFromInternalJson(_domain: string, _listingUrl: string): Promise<ExtractionResult | null> {
  return null;
}
