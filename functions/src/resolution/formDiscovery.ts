import * as cheerio from "cheerio";
import type { ResolutionResult } from "../types";
import { fetchPage, originFor } from "../net/fetchPage";
import { QUERY_TOKEN, buildFromTemplate, validateTemplate } from "./template";

/** Field names that carry the search term on the overwhelming majority of sites. */
const QUERY_NAME_PATTERN = /^(q|s|k|query|search|keyword|keywords|term|searchterm|search_query|text)$/i;
const QUERY_HINT_PATTERN = /search|query|keyword/i;

/**
 * A GET form whose query field we can identify becomes a URL template.
 * POST forms are skipped: their payload cannot be expressed as a shareable
 * search URL, which is what the registry stores.
 */
function templateFromForm($: cheerio.CheerioAPI, form: cheerio.Cheerio<never>, baseUrl: string): string | null {
  const method = (form.attr("method") ?? "get").toLowerCase();
  if (method !== "get") return null;

  const fields = form.find("input, select, textarea").toArray().map((el) => $(el));
  const queryField = fields.find((field) => {
    const name = field.attr("name");
    if (!name) return false;
    if (field.attr("type") === "search" || QUERY_NAME_PATTERN.test(name)) return true;
    const hints = `${name} ${field.attr("id") ?? ""} ${field.attr("placeholder") ?? ""} ${field.attr("aria-label") ?? ""}`;
    return QUERY_HINT_PATTERN.test(hints) && (field.attr("type") ?? "text") === "text";
  });
  if (!queryField) return null;

  let action: URL;
  try {
    action = new URL(form.attr("action")?.trim() || baseUrl, baseUrl);
  } catch {
    return null;
  }
  if (action.protocol !== "https:" && action.protocol !== "http:") return null;

  // Hidden fields often carry a category or store scope the search needs.
  const params = new URLSearchParams();
  for (const field of fields) {
    const name = field.attr("name");
    if (!name || field === queryField) continue;
    if (field.attr("type") === "hidden" && field.attr("value")) params.set(name, field.attr("value") as string);
  }
  params.set(queryField.attr("name") as string, QUERY_TOKEN);

  action.search = "";
  // URLSearchParams percent-encodes the braces, so put the token back verbatim.
  return `${action.toString()}?${params.toString()}`.replace(encodeURIComponent(QUERY_TOKEN), QUERY_TOKEN);
}

/**
 * Pure over already-fetched homepage HTML: finds the first form that looks
 * like a site search and returns a `{query}` URL template for it.
 */
export function discoverSearchTemplate(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);

  // Forms that advertise themselves as search go first, then everything else.
  const ordered = [
    ...$('form[role="search"], form[id*="search" i], form[class*="search" i], form[action*="search" i]').toArray(),
    ...$("form").toArray(),
  ];

  const seen = new Set<unknown>();
  for (const el of ordered) {
    if (seen.has(el)) continue;
    seen.add(el);
    const template = templateFromForm($, $(el) as unknown as cheerio.Cheerio<never>, baseUrl);
    if (template) return template;
  }
  return null;
}

/**
 * Resolution method B: fetch the domain's homepage, find its search form and
 * derive a search URL from it. Fully generic, no per-retailer configuration.
 */
export async function resolveFromFormDiscovery(domain: string, query: string): Promise<ResolutionResult | null> {
  const origin = originFor(domain);
  const html = await fetchPage(origin);
  if (!html) return null;

  const template = discoverSearchTemplate(html, origin);
  if (!template || !validateTemplate(template)) return null;

  return {
    method: "form-discovery",
    listingUrl: buildFromTemplate(template, query),
    confidence: 0.75,
    searchUrlPattern: template,
  };
}
