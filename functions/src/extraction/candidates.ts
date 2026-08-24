import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ScoredCandidate } from "../types";
import { scoreMatch } from "../matching/score";

const PRICE_PATTERN = /(?:R|ZAR|\$|£|€)\s?\d[\d ,]*\.?\d{0,2}|\d[\d ,]*\.\d{2}\s?(?:USD|GBP|EUR|ZAR)\b/;
const MAX_CARD_DEPTH = 6;
const MAX_CARD_TEXT_LENGTH = 1200;
const MAX_CANDIDATES = 12;

interface RawCandidate {
  title: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  tier: 3 | 4;
}

function currencyFromText(text: string): string {
  if (text.includes("R") || /\bZAR\b/.test(text)) return "ZAR";
  if (text.includes("£") || /\bGBP\b/.test(text)) return "GBP";
  if (text.includes("€") || /\bEUR\b/.test(text)) return "EUR";
  return "USD";
}

function parsePrice(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ""));
}

function absolute(href: string | undefined, baseUrl: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, baseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Tier 3 over a results page: JSON-LD ItemList entries, which is how most
 * platforms mark up a search result set.
 */
function candidatesFromJsonLd($: cheerio.CheerioAPI, baseUrl: string): RawCandidate[] {
  const found: RawCandidate[] = [];

  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).text());
    } catch {
      continue;
    }

    const stack: unknown[] = [parsed];
    while (stack.length > 0 && found.length < MAX_CANDIDATES) {
      const node = stack.pop();
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      if (!node || typeof node !== "object") continue;

      const record = node as Record<string, unknown>;
      for (const key of ["@graph", "itemListElement", "item", "mainEntity"]) {
        if (record[key]) stack.push(record[key]);
      }

      const type = record["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;

      const offersRaw = record.offers;
      const offer = (Array.isArray(offersRaw) ? offersRaw[0] : offersRaw) as Record<string, unknown> | undefined;
      const price = Number(offer?.price);
      if (!offer || Number.isNaN(price)) continue;

      const url = absolute((record.url as string) ?? (offer.url as string), baseUrl);
      found.push({
        title: String(record.name ?? ""),
        price,
        currency: String(offer.priceCurrency ?? "USD"),
        url: url ?? baseUrl,
        inStock: String(offer.availability ?? "InStock").includes("InStock"),
        tier: 3,
      });
    }
  }

  return found;
}

/**
 * Tier 4 over a results page: every currency-shaped string is treated as a
 * price, then the nearest ancestor that also holds a product link is treated as
 * that price's card. Cards that swallow most of the page are rejected, which is
 * what stops the whole results list collapsing into one candidate.
 */
function candidatesFromCards($: cheerio.CheerioAPI, baseUrl: string): RawCandidate[] {
  const found: RawCandidate[] = [];
  const seenUrls = new Set<string>();

  $("*").each((_, node) => {
    if (found.length >= MAX_CANDIDATES) return false;

    const el = $(node);
    const ownText = el
      .contents()
      .filter((__, child) => child.type === "text")
      .text();
    const priceMatch = PRICE_PATTERN.exec(ownText);
    if (!priceMatch) return;

    let card: cheerio.Cheerio<AnyNode> = el;
    let link: cheerio.Cheerio<AnyNode> | null = null;
    for (let depth = 0; depth < MAX_CARD_DEPTH && card.length && !card.is("body, html"); depth++) {
      if (card.text().length > MAX_CARD_TEXT_LENGTH) break;
      const anchors = card.find("a[href]").filter((__, a) => $(a).text().trim().length > 3);
      if (anchors.length > 0) {
        link = anchors.first();
        break;
      }
      card = card.parent();
    }
    if (!link) return;

    const url = absolute(link.attr("href"), baseUrl);
    if (!url || seenUrls.has(url)) return;

    const title =
      card.find("h1, h2, h3, h4, [itemprop='name']").first().text().trim() ||
      link.attr("title")?.trim() ||
      link.text().trim();
    if (!title) return;

    const price = parsePrice(priceMatch[0]);
    if (Number.isNaN(price) || price <= 0) return;

    seenUrls.add(url);
    found.push({
      title,
      price,
      currency: currencyFromText(priceMatch[0]),
      url,
      inStock: !/out of stock|sold out|unavailable/i.test(card.text()),
      tier: 4,
    });
    return;
  });

  return found;
}

/**
 * Pulls every plausible product off a resolved search-results page and scores
 * each against the query. The caller takes the top match when confidence is
 * high, and hands the list to the confirm-matches step when it is not.
 */
export function extractCandidates(html: string, baseUrl: string, query: string): ScoredCandidate[] {
  const $ = cheerio.load(html);

  const raw = candidatesFromJsonLd($, baseUrl);
  const candidates = raw.length > 0 ? raw : candidatesFromCards($, baseUrl);

  return candidates
    .map((candidate) => ({ ...candidate, matchConfidence: scoreMatch(query, candidate.title).confidence }))
    .sort((a, b) => b.matchConfidence - a.matchConfidence || a.price - b.price)
    .slice(0, MAX_CANDIDATES);
}
