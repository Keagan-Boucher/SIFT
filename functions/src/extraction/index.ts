import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { ExtractionResult } from "../types";
import { extractFromOfficialApi } from "./officialApi";
import { extractFromInternalJson } from "./internalJson";
import { extractStructuredData } from "./structuredData";
import { extractHeuristic } from "./heuristicHtml";

interface ExtractRequest {
  listingUrl: string;
  domain: string;
  query: string;
}

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "for", "with", "of", "in"]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Stage 2: given a resolved listing page, get what's on it.
 * Tries the cleanest source first and falls back down the cascade.
 * Tiers 1-2 need per-retailer config and are tracked as Future
 * Considerations, so they're the only ones that still take the raw
 * URL. Tiers 3-4 are pure HTML parsers, so the page is fetched once
 * here and handed to both.
 */
export const extractListing = onCall<ExtractRequest, Promise<ExtractionResult | null>>(async (request) => {
  const { listingUrl, domain, query } = request.data;
  if (!listingUrl || !domain || !query) {
    throw new HttpsError("invalid-argument", "listingUrl, domain and query are required");
  }

  const viaApi = await extractFromOfficialApi(domain, listingUrl);
  if (viaApi) return viaApi;

  const viaInternalJson = await extractFromInternalJson(domain, listingUrl);
  if (viaInternalJson) return viaInternalJson;

  const response = await fetch(listingUrl);
  if (!response.ok) return null;
  const html = await response.text();

  return extractStructuredData(html) ?? extractHeuristic(html, tokenize(query));
});
