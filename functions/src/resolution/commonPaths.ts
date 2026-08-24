import type { ResolutionResult } from "../types";
import { buildFromTemplate } from "./template";

/**
 * Search paths that are conventional across the web rather than tied to one
 * platform or one retailer. They are guesses, so they sit last in the cascade
 * and are only accepted once a fetch of the URL actually yields prices.
 */
const COMMON_SEARCH_PATHS = [
  "/search?q={query}",
  "/search?query={query}",
  "/search?keyword={query}",
  "/catalogsearch/result/?q={query}",
  "/?s={query}",
];

/**
 * Last-resort resolution: try the conventional search paths. Generic, no
 * per-retailer configuration, and harmless because the validated cascade
 * discards any that do not produce a real results page.
 */
export function commonPathCandidates(origin: string, query: string): ResolutionResult[] {
  return COMMON_SEARCH_PATHS.map((path) => ({
    method: "platform-pattern" as const,
    listingUrl: buildFromTemplate(origin + path, query),
    confidence: 0.3,
    searchUrlPattern: origin + path,
  }));
}

/**
 * Markers of a page whose content is assembled in the browser. When one of
 * these is the whole homepage, there is no search form to find and no prices to
 * read, which is the known limitation headless rendering would fix.
 */
const CLIENT_RENDER_MARKERS = [
  /<div[^>]+id=["'](root|app|__next|__nuxt)["']/i,
  /__NEXT_DATA__/,
  /ng-version=/i,
  /data-reactroot/i,
  /window\.__NUXT__/,
];

/** True when the homepage looks like a shell that fills itself in via JavaScript. */
export function looksClientRendered(html: string): boolean {
  return CLIENT_RENDER_MARKERS.some((marker) => marker.test(html));
}

/**
 * Phrases a storefront uses when its search genuinely found nothing. Worth
 * detecting, because "this shop does not stock it" and "we could not read the
 * page" are different answers and only one of them is the scraper's fault.
 */
const NO_RESULTS_PATTERNS = [
  /no products were found/i,
  /no results (were )?found/i,
  // The word boundary matters: without it this matches "10 results".
  /0 results/i,
  /your search .{0,40}did not match/i,
  /we could(n.t| not) find any/i,
  /nothing (was )?found/i,
  /no matches found/i,
  /sorry, no products/i,
];

/**
 * True when the page is a search-results page reporting an empty result set.
 *
 * Only meaningful once extraction has already come back empty. Plenty of themes
 * ship the empty-state wording in the markup and hide it with CSS, so on a page
 * that does have products this says nothing useful.
 */
export function looksLikeNoResults(html: string): boolean {
  return NO_RESULTS_PATTERNS.some((pattern) => pattern.test(html));
}
