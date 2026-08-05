import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { ResolutionResult } from "../types";
import { resolveFromRegistry } from "./registry";
import { resolveFromFormDiscovery } from "./formDiscovery";
import { resolveFromPlatformPattern } from "./platformPattern";

interface ResolveRequest {
  domain: string;
  query: string;
}

/**
 * Stage 1: works out which page holds the listing.
 * Cascade: stored registry template -> generic form discovery -> known platform patterns.
 * Falls through to null so the client can prompt the user to paste a search URL (user-provided).
 */
export const resolveListingUrl = onCall<ResolveRequest, Promise<ResolutionResult | null>>(async (request) => {
  const { domain, query } = request.data;
  if (!domain || !query) {
    throw new HttpsError("invalid-argument", "domain and query are required");
  }

  return (
    (await resolveFromRegistry(domain, query)) ??
    (await resolveFromFormDiscovery(domain, query)) ??
    (await resolveFromPlatformPattern(domain, query)) ??
    null
  );
});
