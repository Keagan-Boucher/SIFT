import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { ExtractionResult } from "../types";
import { extractFromOfficialApi } from "./officialApi";
import { extractFromInternalJson } from "./internalJson";
import { extractStructuredData } from "./structuredData";
import { extractHeuristic } from "./heuristicHtml";
import { extractHeadless } from "./headless";
import { fetchPage } from "../net/fetchPage";

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
 * here and handed to both. Tier 5 only runs once 3-4 have both come
 * back empty, since it costs a whole browser rather than a fetch.
 *
 * A headless render needs far more memory and time than the rest of
 * the cascade, so this callable overrides the platform defaults.
 */
export const extractListing = onCall<ExtractRequest, Promise<ExtractionResult | null>>(
  { memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    const { listingUrl, domain, query } = request.data;
    if (!listingUrl || !domain || !query) {
      throw new HttpsError("invalid-argument", "listingUrl, domain and query are required");
    }

    const viaApi = await extractFromOfficialApi(domain, listingUrl);
    if (viaApi) return viaApi;

    const viaInternalJson = await extractFromInternalJson(domain, listingUrl);
    if (viaInternalJson) return viaInternalJson;

    const tokens = tokenize(query);

    // A page robots.txt refuses is reported as "nothing found" rather than
    // thrown, so the cascade still falls through to a headless render, which
    // makes its own robots.txt check before it launches a browser.
    let html: string | null = null;
    try {
      html = await fetchPage(listingUrl);
    } catch {
      html = null;
    }
    const viaStatic = html ? extractStructuredData(html) ?? extractHeuristic(html, tokens) : null;
    if (viaStatic) return viaStatic;

    return extractHeadless(listingUrl, tokens);
  },
);
