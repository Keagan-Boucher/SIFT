import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import type { ResolutionResult } from "../types";
import { BlockedByRobotsError, normaliseDomain } from "../net/fetchPage";
import { resolveFromRegistry, recordTemplate } from "./registry";
import { resolveFromFormDiscovery } from "./formDiscovery";
import { resolveFromPlatformPattern } from "./platformPattern";
import { buildFromTemplate, validateTemplate } from "./template";

interface ResolveRequest {
  domain: string;
  query: string;
  /** Method D: a search URL the user pasted, with the query term left in place. */
  userSearchUrl?: string;
}

/**
 * Turns a user-pasted search URL into a reusable template by replacing the
 * query term they searched for with the {query} token.
 */
export function templateFromUserUrl(userSearchUrl: string, query: string): string | null {
  let url: URL;
  try {
    url = new URL(userSearchUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const terms = [query, query.replace(/\s+/g, "+"), query.replace(/\s+/g, "-"), query.replace(/\s+/g, "")];
  for (const [key, value] of url.searchParams) {
    if (terms.some((term) => value.toLowerCase() === term.toLowerCase())) {
      url.searchParams.set(key, "__SIFT_QUERY__");
      return url.toString().replace("__SIFT_QUERY__", "{query}");
    }
  }
  return null;
}

/**
 * Stage 1: works out which page holds the listing.
 * Cascade: stored registry template -> generic form discovery -> known platform
 * patterns -> a search URL the user pasted once. Anything discovered outside the
 * registry is written back to it, so a site solved once is solved for everyone.
 */
export async function resolveDomain(
  rawDomain: string,
  query: string,
  userSearchUrl?: string,
): Promise<ResolutionResult | null> {
  const domain = normaliseDomain(rawDomain);

  if (userSearchUrl) {
    const template = templateFromUserUrl(userSearchUrl, query);
    if (template && validateTemplate(template)) {
      await recordTemplate(domain, template, "user-provided");
      return { method: "user-provided", listingUrl: buildFromTemplate(template, query), confidence: 0.95, searchUrlPattern: template };
    }
    // The pasted URL had no recognisable query term, so use it as-is this once.
    return { method: "user-provided", listingUrl: userSearchUrl, confidence: 0.8 };
  }

  try {
    const fromRegistry = await resolveFromRegistry(domain, query);
    if (fromRegistry) return fromRegistry;

    const discovered = (await resolveFromFormDiscovery(domain, query)) ?? (await resolveFromPlatformPattern(domain, query));
    if (discovered?.searchUrlPattern) await recordTemplate(domain, discovered.searchUrlPattern, discovered.method);
    return discovered;
  } catch (error) {
    if (error instanceof BlockedByRobotsError) {
      logger.info(`robots.txt refused ${domain}, marking blocked`);
      return { method: "form-discovery", listingUrl: "", confidence: 0, blocked: true };
    }
    throw error;
  }
}

export const resolveListingUrl = onCall<ResolveRequest, Promise<ResolutionResult | null>>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "sign in to resolve a source");

  const { domain, query, userSearchUrl } = request.data;
  if (!domain || !query) throw new HttpsError("invalid-argument", "domain and query are required");

  return resolveDomain(domain, query, userSearchUrl);
});
