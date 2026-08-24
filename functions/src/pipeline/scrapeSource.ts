import { logger } from "firebase-functions";

import type { ResolutionMethod, ScoredCandidate, SourceStatus } from "../types";
import { BlockedByRobotsError, describeFetchFailure, fetchPage, normaliseDomain } from "../net/fetchPage";
import { planResolution, acceptResolution } from "../resolution";
import { looksLikeNoResults } from "../resolution/commonPaths";
import { recordOutcome } from "../resolution/registry";
import { extractCandidates } from "../extraction/candidates";
import { tokenize } from "../matching/score";

/**
 * Each candidate URL costs a fetch, and the per-host limiter runs them one at a
 * time, so the list is capped rather than exhausted.
 */
const MAX_CANDIDATE_URLS = 5;

/**
 * A results page whose best match scores below this does not contain the
 * product: what was read is navigation, filters or an empty-search page. Taking
 * it anyway would turn "not found" into a confidently wrong price, which is the
 * exact failure the confidence scoring exists to prevent. Anything above this
 * but below CONFIRM_THRESHOLD is still shown, flagged for the user to confirm.
 */
const MIN_ACCEPTABLE_MATCH = 0.25;

export interface ScrapeSuccess {
  ok: true;
  method: ResolutionMethod;
  listingUrl: string;
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
 * Whether the product the user asked for appears on the page at all. If none of
 * the query's own words are anywhere in the text, the results were not in the
 * HTML we were served: the page lists categories and filters, and the products
 * themselves arrive later via JavaScript.
 */
function pageMentionsQuery(html: string, query: string): boolean {
  const text = html.toLowerCase();
  const tokens = tokenize(query);
  return tokens.length === 0 || tokens.some((token) => text.includes(token));
}

/**
 * A search URL that returns the homepage again is not a search page. This
 * catches the common case of a JavaScript-driven search form with no action
 * attribute, where the derived URL is just the homepage with a stray parameter.
 */
function isSamePageAsHomepage(html: string, homepage: string | null): boolean {
  if (!homepage) return false;
  if (html === homepage) return true;
  // Length alone is enough for pages that differ only by a nonce or timestamp.
  return Math.abs(html.length - homepage.length) < 64 && html.slice(0, 2000) === homepage.slice(0, 2000);
}

/**
 * One source, end to end: work out which pages might hold the listing, then try
 * them in order until one actually yields prices. Resolution only guesses, so
 * nothing is accepted, or written back to the registry, until a fetch proves it.
 *
 * Both the live search pipeline and the saved-search recheck run through here,
 * so they cannot drift apart. Never throws: a source that fails reports why and
 * the caller carries on with the rest.
 */
export async function scrapeSource(
  query: string,
  rawDomain: string,
  userSearchUrl?: string,
): Promise<ScrapeOutcome> {
  const domain = normaliseDomain(rawDomain);

  try {
    const plan = await planResolution(domain, query, userSearchUrl);

    if (plan.blocked) {
      return { ok: false, status: "BLOCKED", reason: "robots.txt refuses automated access" };
    }
    if (plan.unreachable) {
      return {
        ok: false,
        status: "FAILED",
        reason: plan.homepageFetch ? describeFetchFailure(plan.homepageFetch) : "The site could not be reached",
      };
    }
    if (plan.candidates.length === 0) {
      return {
        ok: false,
        status: "FAILED",
        reason: plan.clientRendered
          ? "The site builds its pages in the browser, so there is no search form to read"
          : "No search page could be resolved",
      };
    }

    let lastMethod: ResolutionMethod | undefined;
    let fetchedAny = false;
    let matchedNothing = false;
    let productAbsentFromPage = false;
    let emptyResultSet = false;
    let attempted = 0;
    let refused = 0;

    for (const resolution of plan.candidates.slice(0, MAX_CANDIDATE_URLS)) {
      lastMethod = resolution.method;
      attempted++;

      let html: string | null;
      try {
        html = await fetchPage(resolution.listingUrl);
      } catch (error) {
        // Plenty of sites allow the homepage but disallow /search. That refuses
        // one guess, not the whole domain, so the cascade carries on.
        if (error instanceof BlockedByRobotsError) {
          refused++;
          continue;
        }
        throw error;
      }
      if (!html) continue;
      if (isSamePageAsHomepage(html, plan.homepage)) continue;
      fetchedAny = true;

      if (looksLikeNoResults(html)) {
        emptyResultSet = true;
        continue;
      }

      const candidates = extractCandidates(html, resolution.listingUrl, query);
      if (candidates.length === 0) continue;

      if (candidates[0].matchConfidence < MIN_ACCEPTABLE_MATCH) {
        matchedNothing = true;
        if (!pageMentionsQuery(html, query)) productAbsentFromPage = true;
        continue;
      }

      // Only now is the route known to work, so this is when it is written back.
      await acceptResolution(domain, resolution);
      await recordOutcome(domain, true);

      return { ok: true, method: resolution.method, listingUrl: resolution.listingUrl, candidates };
    }

    await recordOutcome(domain, false);

    // Only when every route we had was refused is the source itself off-limits.
    if (attempted > 0 && refused === attempted) {
      return {
        ok: false,
        status: "BLOCKED",
        method: lastMethod,
        reason: "robots.txt refuses automated access to this site's search pages",
      };
    }

    return {
      ok: false,
      status: "FAILED",
      method: lastMethod,
      reason: emptyResultSet
        ? "The site's own search found nothing for this product"
        : productAbsentFromPage
        ? "The search page never mentions this product, so its results are loaded in the browser rather than sent as HTML"
        : matchedNothing
          ? "The search page listed prices, but none of them were this product"
          : plan.clientRendered
            ? "The site builds its pages in the browser, so the HTML carries no prices"
            : fetchedAny
              ? "The search page carried no prices in its HTML, so they are drawn in the browser"
              : "No search page could be reached",
    };
  } catch (error) {
    if (error instanceof BlockedByRobotsError) {
      return { ok: false, status: "BLOCKED", reason: "robots.txt refuses automated access" };
    }
    logger.error(`source ${domain} failed`, error);
    return { ok: false, status: "FAILED", reason: "Unexpected error while scraping" };
  }
}
