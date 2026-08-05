import type { ResolutionResult } from "../types";

/**
 * Matches the domain against known ecommerce platform fingerprints
 * (Shopify, WooCommerce, Magento, etc.) and applies that platform's
 * standard search URL pattern.
 */
export async function resolveFromPlatformPattern(_domain: string, _query: string): Promise<ResolutionResult | null> {
  // TODO: fingerprint the platform (e.g. /cdn/shop/ for Shopify) and apply its known search path.
  return null;
}
