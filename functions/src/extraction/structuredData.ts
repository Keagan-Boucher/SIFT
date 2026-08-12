import * as cheerio from "cheerio";
import type { ExtractionResult } from "../types";

interface JsonLdOffer {
  price?: string | number;
  priceCurrency?: string;
  availability?: string;
}

interface JsonLdProduct {
  "@type"?: string | string[];
  name?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
}

function isProductNode(node: unknown): node is JsonLdProduct {
  if (!node || typeof node !== "object") return false;
  const type = (node as JsonLdProduct)["@type"];
  return type === "Product" || (Array.isArray(type) && type.includes("Product"));
}

/** JSON-LD nests products directly, inside `@graph`, or inside a top-level array. */
function flattenJsonLd(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenJsonLd);
  if (parsed && typeof parsed === "object") {
    const graph = (parsed as { "@graph"?: unknown })["@graph"];
    if (graph) return flattenJsonLd(graph);
    return [parsed];
  }
  return [];
}

function productFromJsonLd($: cheerio.CheerioAPI): ExtractionResult | null {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).text());
    } catch {
      continue;
    }

    const product = flattenJsonLd(parsed).find(isProductNode) as JsonLdProduct | undefined;
    if (!product?.offers) continue;

    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    const price = Number(offer?.price);
    if (!offer || Number.isNaN(price)) continue;

    return {
      tier: 3,
      title: product.name ?? "",
      price,
      currency: offer.priceCurrency ?? "USD",
      inStock: offer.availability?.includes("InStock") ?? true,
    };
  }
  return null;
}

function productFromOpenGraph($: cheerio.CheerioAPI): ExtractionResult | null {
  const priceEl = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').first();
  const titleEl = $('meta[property="og:title"]').first();
  const price = priceEl.attr("content");
  const title = titleEl.attr("content");
  if (!price || !title) return null;

  const currencyEl = $('meta[property="product:price:currency"], meta[property="og:price:currency"]').first();

  return {
    tier: 3,
    title,
    price: Number(price),
    currency: currencyEl.attr("content") ?? "USD",
    inStock: true,
  };
}

function productFromMicrodata($: cheerio.CheerioAPI): ExtractionResult | null {
  const scope = $('[itemtype*="schema.org/Product"]').first();
  if (!scope.length) return null;

  const priceEl = scope.find('[itemprop="price"]').first();
  const priceRaw = priceEl.attr("content") ?? priceEl.text();
  const price = Number(priceRaw.replace(/[^0-9.]/g, ""));
  if (!priceRaw || Number.isNaN(price)) return null;

  const availability = scope.find('[itemprop="availability"]').attr("href") ?? "";

  return {
    tier: 3,
    title: scope.find('[itemprop="name"]').first().text().trim(),
    price,
    currency: scope.find('[itemprop="priceCurrency"]').attr("content") ?? "USD",
    inStock: availability ? availability.includes("InStock") : true,
  };
}

/**
 * Tier 3 (MVP): structured data embedded in the HTML - JSON-LD Product
 * schema, Open Graph price tags, or microdata. Fully generic, no
 * per-retailer configuration required.
 *
 * Pure function over already-fetched HTML (no network call) so it can run
 * against saved fixtures in tests as well as inside the extraction cascade.
 */
export function extractStructuredData(html: string): ExtractionResult | null {
  const $ = cheerio.load(html);
  return productFromJsonLd($) ?? productFromOpenGraph($) ?? productFromMicrodata($);
}
