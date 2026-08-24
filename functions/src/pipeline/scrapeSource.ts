import { logger } from "firebase-functions";

import type { ResolutionMethod, ScoredCandidate, SourceStatus } from "../types";
import { BlockedByRobotsError, fetchPage } from "../net/fetchPage";
import { resolveDomain } from "../resolution";
import { recordOutcome } from "../resolution/registry";
import { extractCandidates } from "../extraction/candidates";

export interface ScrapeSuccess {
  ok: true;
  method: ResolutionMethod;
  /** Ranked best first by match confidence, then by price. */
  candidates: ScoredCandidate[];
}

export interface ScrapeFailure {
  ok: false;
  status: Extract<SourceStatus, "BLOCKED" | "FAILED">;
  method?: ResolutionMethod;
  reason: string;
}

export type ScrapeOutcome = ScrapeSuccess | ScrapeFailure;

/**
 * One source, end to end: resolve which page holds the listing, fetch it, and
 * score every product on it against the query. Both the live search pipeline
 * and the saved-search recheck run through here, so they cannot drift apart.
 *
 * Never throws. A source that fails reports why, and the caller carries on with
 * the rest.
 */
export async function scrapeSource(
  query: string,
  domain: string,
  userSearchUrl?: string,
): Promise<ScrapeOutcome> {
  try {
    const resolution = await resolveDomain(domain, query, userSearchUrl);
    if (!resolution) return { ok: false, status: "FAILED", reason: "No search page could be resolved" };
    if (resolution.blocked) {
      return { ok: false, status: "BLOCKED", reason: "robots.txt refuses automated access" };
    }

    const html = await fetchPage(resolution.listingUrl);
    if (!html) {
      await recordOutcome(domain, false);
      return { ok: false, status: "FAILED", method: resolution.method, reason: "Search page could not be fetched" };
    }

    const candidates = extractCandidates(html, resolution.listingUrl, query);
    if (candidates.length === 0) {
      await recordOutcome(domain, false);
      // The known limitation: client-rendered pages return HTML with no prices.
      return { ok: false, status: "FAILED", method: resolution.method, reason: "No prices in the page HTML" };
    }

    await recordOutcome(domain, true);
    return { ok: true, method: resolution.method, candidates };
  } catch (error) {
    if (error instanceof BlockedByRobotsError) {
      return { ok: false, status: "BLOCKED", reason: "robots.txt refuses automated access" };
    }
    logger.error(`source ${domain} failed`, error);
    return { ok: false, status: "FAILED", reason: "Unexpected error while scraping" };
  }
}
