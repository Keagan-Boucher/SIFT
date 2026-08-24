import { logger } from "firebase-functions";

import type { ResolutionMethod, ScoredCandidate, SourceStatus } from "../types";
import { BlockedByRobotsError, describeFetchFailure, fetchPageDetailed, normaliseDomain } from "../net/fetchPage";
import type { FetchResult } from "../net/fetchPage";
import { planResolution, acceptResolution } from "../resolution";
import { looksLikeNoResults } from "../resolution/commonPaths";
import { recordOutcome } from "../resolution/registry";
import { extractCandidates } from "../extraction/candidates";
import { extractCandidatesHeadless } from "../extraction/headless";
import { relaxedQueries } from "../matching/relax";
import { buildFromTemplate } from "../resolution/template";
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
  // Overridable so tests can pin down the headless-fallback decision without
  // a Chromium binary, which is not available in this environment.
  headlessExtract: typeof extractCandidatesHeadless = extractCandidatesHeadless,
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
    // A fetched page that read as neither "has candidates" nor "reports no
    // results" is the case a plain fetch cannot tell apart from a page whose
    // products simply have not arrived yet: the markup is there, nothing
    // price-shaped is in it, and the theme's empty-state wording is not either.
    // That is exactly what a client-rendered results page looks like before its
    // JavaScript runs, so it is worth a headless render alongside the two cases
    // already known to mean that.
    let noPricesInHtml = false;
    let attempted = 0;
    let refused = 0;
    // Kept so a total failure can report what actually happened on the last
    // attempt, rather than a generic "could not be reached".
    let lastFailure: FetchResult | null = null;
    // The first route that served a real search page. If the strict query found
    // nothing, this is the one worth asking again in looser terms.
    let readablePattern: string | null = null;

    for (const resolution of plan.candidates.slice(0, MAX_CANDIDATE_URLS)) {
      lastMethod = resolution.method;
      attempted++;

      let attempt: FetchResult;
      try {
        attempt = await fetchPageDetailed(resolution.listingUrl);
      } catch (error) {
        // Plenty of sites allow the homepage but disallow /search. That refuses
        // one guess, not the whole domain, so the cascade carries on.
        if (error instanceof BlockedByRobotsError) {
          refused++;
          continue;
        }
        throw error;
      }
      const html = attempt.html;
      if (!html) {
        lastFailure = attempt;
        continue;
      }
      if (isSamePageAsHomepage(html, plan.homepage)) continue;
      fetchedAny = true;
      if (!readablePattern && resolution.searchUrlPattern) readablePattern = resolution.searchUrlPattern;

      // A registry hit, a discovered form or a platform fingerprint is enough
      // trust that this page is genuinely the site's search, not one of five
      // generic /search shapes being guessed blind. Once one of those responds
      // with real content, there is nothing to gain from burning the rest of
      // the guesses before falling back to relaxation on the page we already
      // know works.
      const isTrustedRoute = resolution.confidence >= 0.4;

      const candidates = extractCandidates(html, resolution.listingUrl, query);
      if (candidates.length === 0) {
        // Consulted only now: a theme that ships hidden empty-state wording
        // would otherwise mask a page that does have products on it.
        if (looksLikeNoResults(html)) {
          emptyResultSet = true;
          if (isTrustedRoute) break;
        } else {
          noPricesInHtml = true;
        }
        continue;
      }

      if (candidates[0].matchConfidence < MIN_ACCEPTABLE_MATCH) {
        matchedNothing = true;
        if (!pageMentionsQuery(html, query)) productAbsentFromPage = true;
        if (isTrustedRoute) break;
        continue;
      }

      // Only now is the route known to work, so this is when it is written back.
      await acceptResolution(domain, resolution);
      await recordOutcome(domain, true);

      return { ok: true, method: resolution.method, listingUrl: resolution.listingUrl, candidates };
    }

    // The site has a working search page, it just did not understand the query.
    // Retailer search is a literal AND across words, so a product listed under
    // slightly different wording returns nothing. Ask again with the least
    // distinctive words removed, still scoring against what the user typed.
    if (readablePattern && (emptyResultSet || matchedNothing)) {
      for (const relaxed of relaxedQueries(query).slice(1)) {
        const url = buildFromTemplate(readablePattern, relaxed);
        let retry: FetchResult;
        try {
          retry = await fetchPageDetailed(url);
        } catch (error) {
          if (error instanceof BlockedByRobotsError) break;
          throw error;
        }
        if (!retry.html) continue;

        const candidates = extractCandidates(retry.html, url, query);
        if (candidates.length === 0 || candidates[0].matchConfidence < MIN_ACCEPTABLE_MATCH) continue;

        // Same write-back as the strict-query success path above. Missing this
        // meant a relaxed match never taught the registry anything: the next
        // search on the same domain would silently redo the same relaxation
        // instead of resolving straight from method A.
        const acceptedMethod = lastMethod ?? "platform-pattern";
        await acceptResolution(domain, { method: acceptedMethod, listingUrl: url, confidence: 0.5, searchUrlPattern: readablePattern });
        await recordOutcome(domain, true);
        return { ok: true, method: acceptedMethod, listingUrl: url, candidates };
      }
    }

    // Every plain fetch above came back either empty or without this product,
    // and the site looks like it draws its content in with JavaScript. That is
    // exactly the case a headless render exists for, so it is worth the cost of
    // a browser before giving up on the source entirely. Only the resolution's
    // best guess is rendered, not every candidate URL: a browser is expensive
    // enough that this is a last resort, not another pass of the cascade.
    if (plan.clientRendered || productAbsentFromPage || noPricesInHtml) {
      const target = plan.candidates[0];
      const rendered = await headlessExtract(target.listingUrl, query);

      if (rendered.length > 0 && rendered[0].matchConfidence >= MIN_ACCEPTABLE_MATCH) {
        await acceptResolution(domain, target);
        await recordOutcome(domain, true);
        return { ok: true, method: target.method, listingUrl: target.listingUrl, candidates: rendered };
      }
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
        ? "The site draws its results in with JavaScript, and rendering the page in a browser still found nothing for this product"
        : matchedNothing
          ? "The search page listed prices, but none of them were this product"
          : plan.clientRendered
            ? "The site builds its pages in the browser, and rendering it that way still carried no prices"
            : fetchedAny
              ? "The search page carried no prices in its HTML, and rendering it in a browser still found none"
              : lastFailure
                ? `Its search pages could not be read. ${describeFetchFailure(lastFailure)}`
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
