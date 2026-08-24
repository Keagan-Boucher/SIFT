import type { ResolutionResult } from "../types";
import { fetchPage, originFor } from "../net/fetchPage";
import { buildFromTemplate, validateTemplate } from "./template";

export interface PlatformFingerprint {
  name: string;
  /** Markers that appear in the homepage HTML of a site on this platform. */
  markers: RegExp[];
  /** That platform's standard search path, relative to the site origin. */
  searchPath: string;
}

/**
 * Ordered most to least specific. These are platform-level patterns, not
 * per-retailer configuration: one fingerprint covers every store built on
 * that platform, so the any-site promise holds.
 */
export const PLATFORMS: PlatformFingerprint[] = [
  { name: "Shopify", markers: [/cdn\.shopify\.com/i, /\/cdn\/shop\//i, /Shopify\.theme/i], searchPath: "/search?q={query}" },
  { name: "WooCommerce", markers: [/woocommerce/i, /wp-content\/plugins\/woocommerce/i], searchPath: "/?s={query}&post_type=product" },
  { name: "Magento", markers: [/Magento_Ui\//i, /mage\/cookies/i, /static\/version\d+\/frontend/i], searchPath: "/catalogsearch/result/?q={query}" },
  { name: "BigCommerce", markers: [/cdn\d*\.bigcommerce\.com/i, /stencil-utils/i], searchPath: "/search.php?search_query={query}" },
  { name: "PrestaShop", markers: [/prestashop/i], searchPath: "/search?controller=search&s={query}" },
  { name: "OpenCart", markers: [/catalog\/view\/theme/i, /route=product\/search/i], searchPath: "/index.php?route=product/search&search={query}" },
  { name: "Wix Stores", markers: [/static\.parastorage\.com/i, /wixstores/i], searchPath: "/search?q={query}" },
  { name: "Squarespace", markers: [/static1\.squarespace\.com/i, /Static\.SQUARESPACE_CONTEXT/i], searchPath: "/search?q={query}" },
  { name: "WordPress", markers: [/wp-content\//i, /wp-includes\//i], searchPath: "/?s={query}" },
];

/** Pure over already-fetched homepage HTML: which platform built this site. */
export function fingerprintPlatform(html: string): PlatformFingerprint | null {
  return PLATFORMS.find((platform) => platform.markers.some((marker) => marker.test(html))) ?? null;
}

/**
 * Resolution method C: identify the ecommerce platform from its homepage
 * fingerprint and apply that platform's standard search path. Lower confidence
 * than form discovery because the path is assumed rather than read off the page.
 */
export async function resolveFromPlatformPattern(domain: string, query: string): Promise<ResolutionResult | null> {
  const origin = originFor(domain);
  const html = await fetchPage(origin);
  if (!html) return null;

  const platform = fingerprintPlatform(html);
  if (!platform) return null;

  const template = origin + platform.searchPath;
  if (!validateTemplate(template)) return null;

  // WordPress is the weakest signal: every WooCommerce store is also WordPress,
  // and plenty of WordPress sites are not shops at all.
  const confidence = platform.name === "WordPress" ? 0.45 : 0.6;

  return {
    method: "platform-pattern",
    listingUrl: buildFromTemplate(template, query),
    confidence,
    searchUrlPattern: template,
  };
}
