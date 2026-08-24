import type { ExtractionResult, ScoredCandidate } from "../types";
import { renderPage, type RenderResult } from "../net/headlessBrowser";
import { extractStructuredData } from "./structuredData";
import { extractHeuristic } from "./heuristicHtml";
import { extractCandidates } from "./candidates";

type Render = (url: string) => Promise<RenderResult>;

/**
 * Tier 5, the fix for the known limitation tiers 3-4 both document: a page
 * whose prices are drawn in by client-side JavaScript carries none in the raw
 * HTML. Rendering it in a real browser first turns that JavaScript-built page
 * into ordinary HTML, which is then handed to the same parsers tiers 3 and 4
 * already use. Only reached once every cheaper tier has failed, since a
 * browser costs far more than a fetch.
 *
 * `render` defaults to the real headless browser and is only ever overridden
 * by tests, which have no Chromium binary to launch.
 */
export async function extractHeadless(
  url: string,
  tokens: string[],
  render: Render = renderPage,
): Promise<ExtractionResult | null> {
  const { html } = await render(url);
  if (!html) return null;

  const result = extractStructuredData(html) ?? extractHeuristic(html, tokens);
  return result ? { ...result, tier: 5 } : null;
}

/** The results-page equivalent of {@link extractHeadless}: renders, then scores every candidate on the page. */
export async function extractCandidatesHeadless(
  url: string,
  query: string,
  render: Render = renderPage,
): Promise<ScoredCandidate[]> {
  const { html } = await render(url);
  if (!html) return [];

  return extractCandidates(html, url, query).map((candidate) => ({ ...candidate, tier: 5 }));
}
