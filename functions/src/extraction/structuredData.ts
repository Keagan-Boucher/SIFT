import * as cheerio from "cheerio";
import type { ExtractionResult } from "../types";

/**
 * Tier 3 (MVP): structured data embedded in the HTML - JSON-LD Product
 * schema, Open Graph price tags, or microdata. Fully generic, no
 * per-retailer configuration required.
 */
export async function extractFromStructuredData(listingUrl: string): Promise<ExtractionResult | null> {
  const response = await fetch(listingUrl);
  if (!response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);

  const jsonLd = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => {
      try {
        return JSON.parse($(el).text());
      } catch {
        return null;
      }
    })
    .find((data) => data?.["@type"] === "Product");

  if (jsonLd?.offers) {
    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    return {
      tier: 3,
      title: jsonLd.name,
      price: Number(offer.price),
      currency: offer.priceCurrency ?? "USD",
      inStock: offer.availability?.includes("InStock") ?? true,
    };
  }

  const ogPrice = $('meta[property="product:price:amount"]').attr("content");
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogPrice && ogTitle) {
    return {
      tier: 3,
      title: ogTitle,
      price: Number(ogPrice),
      currency: $('meta[property="product:price:currency"]').attr("content") ?? "USD",
      inStock: true,
    };
  }

  return null;
}
