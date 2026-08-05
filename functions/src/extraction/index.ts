import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { ExtractionResult } from "../types";
import { extractFromOfficialApi } from "./officialApi";
import { extractFromInternalJson } from "./internalJson";
import { extractFromStructuredData } from "./structuredData";
import { extractFromHeuristicHtml } from "./heuristicHtml";

interface ExtractRequest {
  listingUrl: string;
  domain: string;
}

/**
 * Stage 2: given a resolved listing page, get what's on it.
 * Tries the cleanest source first and falls back down the cascade.
 * MVP covers tiers 3 and 4 only; tiers 1-2 need per-retailer config
 * and are tracked as Future Considerations.
 */
export const extractListing = onCall<ExtractRequest, Promise<ExtractionResult | null>>(async (request) => {
  const { listingUrl, domain } = request.data;
  if (!listingUrl || !domain) {
    throw new HttpsError("invalid-argument", "listingUrl and domain are required");
  }

  return (
    (await extractFromOfficialApi(domain, listingUrl)) ??
    (await extractFromInternalJson(domain, listingUrl)) ??
    (await extractFromStructuredData(listingUrl)) ??
    (await extractFromHeuristicHtml(listingUrl)) ??
    null
  );
});
