import { getFirestore } from "firebase-admin/firestore";
import type { ResolutionResult } from "../types";

/**
 * Looks up a previously solved search-URL template for this domain.
 * Every successful resolution elsewhere writes back here, so a site
 * solved once is solved for everyone after.
 */
export async function resolveFromRegistry(domain: string, query: string): Promise<ResolutionResult | null> {
  const doc = await getFirestore().collection("retailerTemplates").doc(domain).get();
  if (!doc.exists) return null;

  const template = doc.data() as { searchUrlPattern?: string };
  if (!template.searchUrlPattern) return null;

  return {
    method: "registry",
    listingUrl: template.searchUrlPattern.replace("{query}", encodeURIComponent(query)),
    confidence: 0.9,
  };
}
