import type { ResolutionResult } from "../types";

/**
 * Generic fallback: fetch the domain's homepage, look for a <form> that
 * looks like a search box (input[type=search], name containing "q"/"query"/"search"),
 * and submit the query through it to derive a search URL.
 */
export async function resolveFromFormDiscovery(_domain: string, _query: string): Promise<ResolutionResult | null> {
  // TODO: fetch homepage HTML, parse with cheerio, locate a search form, build the URL.
  return null;
}
