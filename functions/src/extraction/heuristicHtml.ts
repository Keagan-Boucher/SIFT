import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ExtractionResult } from "../types";

const CURRENCY_PATTERN = /[$£€]\s?\d[\d,]*\.?\d{0,2}|\d[\d,]*\.\d{2}\s?(?:USD|GBP|EUR)\b/;
const PRICE_ATTR_PATTERN = /price/i;
const MAX_ANCESTOR_DEPTH = 4;
const MAX_CONTAINER_TEXT_LENGTH = 4000;

interface Candidate {
  priceText: string;
  score: number;
}

function currencyFromText(text: string): string {
  if (text.includes("£") || /\bGBP\b/.test(text)) return "GBP";
  if (text.includes("€") || /\bEUR\b/.test(text)) return "EUR";
  return "USD";
}

/**
 * Scores how close the product's keyword tokens appear in the DOM around
 * `el`, walking up the ancestor chain and rewarding closer matches. A
 * container that swallows most of the page (e.g. <body>) is ignored so it
 * can't dominate the score just by containing everything.
 */
function tokenProximityScore($: cheerio.CheerioAPI, el: cheerio.Cheerio<AnyNode>, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  let node: cheerio.Cheerio<AnyNode> = el;
  let best = 0;
  // Stop at <body>/<html>: a match that only shows up once you've climbed to
  // the whole page isn't "proximity", it's just "the token exists somewhere".
  for (let depth = 0; depth <= MAX_ANCESTOR_DEPTH && node.length && !node.is("body, html"); depth++) {
    const text = node.text().toLowerCase();
    if (text.length <= MAX_CONTAINER_TEXT_LENGTH) {
      const matches = tokens.filter((token) => token && text.includes(token.toLowerCase())).length;
      if (matches > 0) best = Math.max(best, matches / (depth + 1));
    }
    node = node.parent();
  }
  return best;
}

function collectCandidates($: cheerio.CheerioAPI, tokens: string[]): Candidate[] {
  const candidates: Candidate[] = [];

  $("*").each((_, node) => {
    const el = $(node);
    // Only the element's own text, not its descendants', so a price node's
    // ancestors don't also register as separate candidates.
    const ownText = el
      .contents()
      .filter((__, c) => c.type === "text")
      .text();
    const match = CURRENCY_PATTERN.exec(ownText);
    if (!match) return;

    const attrText = `${el.attr("class") ?? ""} ${el.attr("id") ?? ""} ${el.attr("data-testid") ?? ""}`;
    const selectorScore = PRICE_ATTR_PATTERN.test(attrText) ? 3 : 0;
    const proximityScore = tokenProximityScore($, el, tokens);

    if (selectorScore === 0 && proximityScore === 0) return;

    candidates.push({ priceText: match[0], score: selectorScore + proximityScore });
  });

  return candidates;
}

/**
 * Tier 4 (MVP, last resort): heuristic HTML parsing. Finds every
 * currency-shaped piece of text, scores each by how "price-like" its own
 * class/id/data-testid is plus how close the product's keyword tokens sit
 * in the DOM, and takes the best-scoring candidate. Fully generic, no
 * per-retailer configuration required.
 *
 * Known limitation: heavily client-rendered sites return HTML with no
 * prices, so this fails even when resolution succeeded. Headless rendering
 * (Playwright on Cloud Run) is the fix, tracked as a Future Consideration.
 */
export function extractHeuristic(html: string, tokens: string[]): ExtractionResult | null {
  const $ = cheerio.load(html);
  const candidates = collectCandidates($, tokens);
  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
  const price = Number(best.priceText.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(price)) return null;

  const title = $("h1").first().text().trim() || $("title").text().trim();

  return {
    tier: 4,
    title,
    price,
    currency: currencyFromText(best.priceText),
    inStock: true,
  };
}
