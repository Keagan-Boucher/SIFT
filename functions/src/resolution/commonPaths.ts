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
