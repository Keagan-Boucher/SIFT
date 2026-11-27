import { onCall, HttpsError } from "firebase-functions/v2/https";

import type { ScoredCandidate } from "../types";
import { normaliseDomain } from "../net/fetchPage";
import { CONFIRM_THRESHOLD } from "../matching/score";
import { GROQ_API_KEY, groqJson } from "./groq";

const MAX_SITES = 5;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export interface QueryUnderstanding {
  /** The product's proper name, spelling fixed. Equal to the query when nothing needed fixing. */
  product: string;
  sites: { domain: string; reason: string }[];
}

const UNDERSTAND_PROMPT = `You help a South African price-comparison app.
The user typed a product search, possibly misspelled or abbreviated.
Return JSON: {"product": string, "sites": [{"domain": string, "reason": string}]}
- product: the exact real product name they most likely mean, correctly spelled, with brand, model and variant they gave. Do not add details they did not give. If it is already correct, return it unchanged.
- sites: up to 5 real South African online retailers likely to sell it, as bare domains like "takealot.com". reason: under 8 words.`;

/** Cleans and bounds the model's answer: it is untrusted text that ends up on screen. */
export function sanitiseUnderstanding(query: string, raw: unknown): QueryUnderstanding {
  const value = (raw ?? {}) as { product?: unknown; sites?: unknown };
  const product = typeof value.product === "string" && value.product.trim() ? value.product.trim().slice(0, 120) : query;
  const sites = (Array.isArray(value.sites) ? value.sites : [])
    .map((site) => ({
      domain: normaliseDomain(String((site as { domain?: unknown })?.domain ?? "")),
      reason: String((site as { reason?: unknown })?.reason ?? "").trim().slice(0, 60) || "Likely stocks it",
    }))
    .filter((site) => DOMAIN.test(site.domain))
    .filter((site, index, all) => all.findIndex((other) => other.domain === site.domain) === index)
    .slice(0, MAX_SITES);
  return { product, sites };
}

/** Typo fixing and site suggestions for the new-search screen. Falls back to the query as typed. */
export const understandQuery = onCall<{ query: string }, Promise<QueryUnderstanding>>(
  { secrets: [GROQ_API_KEY], timeoutSeconds: 15 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign in to search");
    const query = typeof request.data?.query === "string" ? request.data.query.trim() : "";
    if (query.length < 2 || query.length > 200) throw new HttpsError("invalid-argument", "query must be 2-200 characters");

    return sanitiseUnderstanding(query, await groqJson(UNDERSTAND_PROMPT, query));
  },
);

const PICK_PROMPT = `You check product listings for a price-comparison app.
Given the user's search and numbered listing titles, pick the listing that is exactly the product they want:
same brand, model and variant (storage, size, edition, colour if given). Not an accessory, part, refurbished or used item, and not a bundle unless they asked for one. Allow for typos in the search.
Return JSON: {"index": number} with the listing number, or {"index": -1} if none is that product.`;

/** Only uncertain results are sent to the model; near-certain ones are left alone. */
const CERTAIN = 0.9;
const MAX_JUDGED = 5;

/**
 * Second opinion on the word-overlap score. A pick is promoted to the top and
 * trusted; a veto drops the best match to the confirm threshold so the user is
 * asked rather than shown a confident wrong price. No answer changes nothing.
 */
export async function pickMatch(query: string, candidates: ScoredCandidate[]): Promise<ScoredCandidate[]> {
  if (candidates.length === 0 || candidates[0].matchConfidence >= CERTAIN) return candidates;

  const judged = candidates.slice(0, MAX_JUDGED);
  const titles = judged.map((candidate, index) => `${index}. ${candidate.title.slice(0, 200)}`).join("\n");
  const answer = await groqJson<{ index?: unknown }>(PICK_PROMPT, `Search: ${query}\nListings:\n${titles}`);
  return applyPick(candidates, answer?.index);
}

/** Split out so the reordering can be checked without a network call. */
export function applyPick(candidates: ScoredCandidate[], index: unknown): ScoredCandidate[] {
  if (typeof index !== "number" || !Number.isInteger(index) || index >= Math.min(candidates.length, MAX_JUDGED)) {
    return candidates;
  }
  if (index < 0) {
    const [best, ...rest] = candidates;
    return [{ ...best, matchConfidence: Math.min(best.matchConfidence, CONFIRM_THRESHOLD) }, ...rest];
  }
  const picked = candidates[index];
  return [
    { ...picked, matchConfidence: Math.max(picked.matchConfidence, 0.85) },
    ...candidates.filter((_, i) => i !== index),
  ];
}
