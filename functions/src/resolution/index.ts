import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import type { ResolutionResult } from "../types";
import { BlockedByRobotsError, fetchPage, normaliseDomain, originFor } from "../net/fetchPage";
import { resolveFromRegistry, recordTemplate } from "./registry";
import { discoverSearchTemplate } from "./formDiscovery";
import { fingerprintPlatform } from "./platformPattern";
import { commonPathCandidates, looksClientRendered } from "./commonPaths";
import { buildFromTemplate, validateTemplate } from "./template";

interface ResolveRequest {
  domain: string;
  query: string;
  /** Method D: a search URL the user pasted, with the query term left in place. */
  userSearchUrl?: string;
}

/** Everything the caller needs to try, plus why it might not work. */
export interface ResolutionPlan {
  /** Ordered best first. The caller fetches each until one yields prices. */
  candidates: ResolutionResult[];
  /** robots.txt refused the domain outright. */
  blocked: boolean;
  /** The homepage could not be fetched at all. */
  unreachable: boolean;
  /** The homepage is a JavaScript shell, so there was nothing to read. */
  clientRendered: boolean;
  /** The homepage HTML, kept so the caller does not fetch it twice. */
  homepage: string | null;
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
 * Stage 1: works out which pages might hold the listing.
 *
 * The homepage is fetched once and every method reads from that one response,
 * rather than each method fetching it again. Nothing here commits to an answer:
 * a search URL is only a guess until a fetch of it produces prices, so this
 * returns the whole ordered list and lets the caller validate.
 */
export async function planResolution(
  rawDomain: string,
  query: string,
  userSearchUrl?: string,
): Promise<ResolutionPlan> {
  const domain = normaliseDomain(rawDomain);
  const empty: ResolutionPlan = {
    candidates: [],
    blocked: false,
    unreachable: false,
    clientRendered: false,
    homepage: null,
  };

  if (userSearchUrl) {
    const template = templateFromUserUrl(userSearchUrl, query);
    if (template && validateTemplate(template)) {
      return {
        ...empty,
        candidates: [
          {
            method: "user-provided",
            listingUrl: buildFromTemplate(template, query),
            confidence: 0.95,
            searchUrlPattern: template,
          },
        ],
      };
    }
    // The pasted URL had no recognisable query term, so use it as-is this once.
    return { ...empty, candidates: [{ method: "user-provided", listingUrl: userSearchUrl, confidence: 0.8 }] };
  }

  const candidates: ResolutionResult[] = [];

  const fromRegistry = await resolveFromRegistry(domain, query);
  if (fromRegistry) candidates.push(fromRegistry);

  const origin = originFor(domain);
  let homepage: string | null;
  try {
    homepage = await fetchPage(origin);
  } catch (error) {
    if (error instanceof BlockedByRobotsError) {
      logger.info(`robots.txt refused ${domain}`);
      return { ...empty, blocked: true };
    }
    throw error;
  }

  if (!homepage) return { ...empty, candidates, unreachable: candidates.length === 0 };

  const formTemplate = discoverSearchTemplate(homepage, origin);
  if (formTemplate && validateTemplate(formTemplate)) {
    candidates.push({
      method: "form-discovery",
      listingUrl: buildFromTemplate(formTemplate, query),
      confidence: 0.75,
      searchUrlPattern: formTemplate,
    });
  }

  const platform = fingerprintPlatform(homepage);
  if (platform) {
    const template = origin + platform.searchPath;
    if (validateTemplate(template)) {
      candidates.push({
        method: "platform-pattern",
        // WordPress is the weakest signal: every WooCommerce store is also
        // WordPress, and plenty of WordPress sites are not shops at all.
        confidence: platform.name === "WordPress" ? 0.45 : 0.6,
        listingUrl: buildFromTemplate(template, query),
        searchUrlPattern: template,
      });
    }
  }

  candidates.push(...commonPathCandidates(origin, query));

  // Drop duplicates, keeping the highest-confidence route to each URL.
  const seen = new Set<string>();
  const deduped = candidates.filter((candidate) => {
    if (seen.has(candidate.listingUrl)) return false;
    seen.add(candidate.listingUrl);
    return true;
  });

  return { ...empty, candidates: deduped, clientRendered: looksClientRendered(homepage), homepage };
}

/** Records a validated template so the next search on this domain skips straight to method A. */
export async function acceptResolution(domain: string, resolution: ResolutionResult): Promise<void> {
  if (resolution.searchUrlPattern) {
    await recordTemplate(normaliseDomain(domain), resolution.searchUrlPattern, resolution.method);
  }
}

/**
 * Exposed for the app's manual "which page is this?" path. Returns the single
 * best guess without validating it, since validation means fetching, and that
 * is the pipeline's job rather than a lookup's.
 */
export const resolveListingUrl = onCall<ResolveRequest, Promise<ResolutionResult | null>>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "sign in to resolve a source");

  const { domain, query, userSearchUrl } = request.data;
  if (!domain || !query) throw new HttpsError("invalid-argument", "domain and query are required");

  const plan = await planResolution(domain, query, userSearchUrl);
  if (plan.blocked) return { method: "form-discovery", listingUrl: "", confidence: 0, blocked: true };
  return plan.candidates[0] ?? null;
});
