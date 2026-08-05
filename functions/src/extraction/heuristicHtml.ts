import * as cheerio from "cheerio";
import type { ExtractionResult } from "../types";

const PRICE_PATTERN = /[$£€]\s?\d[\d,]*\.?\d{0,2}/;
const PRICE_SELECTORS = ['[class*="price"]', '[id*="price"]', '[data-testid*="price"]'];

/**
 * Tier 4 (MVP, last resort): heuristic HTML parsing. Fully generic.
 * Known limitation: heavily client-rendered sites return HTML with no
 * prices, so this fails even when resolution succeeded. Headless
 * rendering (Playwright on Cloud Run) is the fix, tracked as a Future
 * Consideration.
 */
export async function extractFromHeuristicHtml(listingUrl: string): Promise<ExtractionResult | null> {
  const response = await fetch(listingUrl);
  if (!response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);

  let priceText: string | undefined;
  for (const selector of PRICE_SELECTORS) {
    const match = $(selector).first().text();
    if (PRICE_PATTERN.test(match)) {
      priceText = match.match(PRICE_PATTERN)?.[0];
      break;
    }
  }
  if (!priceText) return null;

  const title = $("h1").first().text().trim() || $("title").text().trim();
  const price = Number(priceText.replace(/[^0-9.]/g, ""));

  return {
    tier: 4,
    title,
    price,
    currency: priceText.includes("£") ? "GBP" : priceText.includes("€") ? "EUR" : "USD",
    inStock: true,
  };
}
