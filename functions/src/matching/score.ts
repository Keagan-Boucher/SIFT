/** Words that carry no product identity and would inflate every score. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "of", "in", "on", "to",
  "new", "brand", "official", "genuine", "original", "buy", "online", "sale", "shop",
]);

const MODEL_TOKEN = /\d/;

/** Splits free text into comparable lowercase tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Accessory listings match the query's words while being the wrong product
 * entirely: a "Galaxy S24 Ultra case" contains every token of the query.
 */
const ACCESSORY_PATTERN = /\b(case|cover|screen protector|charger|cable|adapter|skin|sticker|strap|holder|mount|stand|refurb(ished)?|pre[- ]?owned|used|replica|compatible with|for use with)\b/i;

export interface MatchScore {
  /** 0 to 1. Written to the listing doc and shown as a 1-4 confidence badge. */
  confidence: number;
  /** Query tokens the title did not account for, shown in the confirm step. */
  missing: string[];
}

/**
 * Scores how well a listing title answers the user's query.
 *
 * Tokens containing a digit (256gb, s24, m3) are weighted double: they are the
 * ones that separate a variant from its siblings, and getting them wrong is the
 * failure the confirm-matches step exists to catch. Accessory and
 * refurbished wording applies a penalty, since those listings match the words
 * while being the wrong product.
 */
export function scoreMatch(query: string, title: string): MatchScore {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return { confidence: 0, missing: [] };

  const titleTokens = new Set(tokenize(title));

  let weightTotal = 0;
  let weightMatched = 0;
  const missing: string[] = [];

  for (const token of queryTokens) {
    const weight = MODEL_TOKEN.test(token) ? 2 : 1;
    weightTotal += weight;
    if (titleTokens.has(token)) weightMatched += weight;
    else missing.push(token);
  }

  let confidence = weightMatched / weightTotal;

  // A missing model token paired with a different one in the title is a variant
  // mismatch (256GB against 512GB), not a slightly incomplete title. Word
  // overlap alone still reads high there, which is exactly the wrong-product
  // case the confirm step has to catch.
  const missingModelTokens = missing.filter((token) => MODEL_TOKEN.test(token));
  const rivalModelToken = [...titleTokens].some((token) => MODEL_TOKEN.test(token) && !queryTokens.includes(token));
  if (missingModelTokens.length > 0 && rivalModelToken) confidence *= 0.6;

  if (ACCESSORY_PATTERN.test(title) && !ACCESSORY_PATTERN.test(query)) confidence *= 0.4;

  return { confidence: Math.round(confidence * 100) / 100, missing };
}

/** Below this the user is asked to pick the right listing rather than trusting the match. */
export const CONFIRM_THRESHOLD = 0.6;

/** Maps a 0-1 confidence onto the 1-4 badge the UI renders. */
export function confidenceBadge(confidence: number): 1 | 2 | 3 | 4 {
  if (confidence >= 0.9) return 4;
  if (confidence >= CONFIRM_THRESHOLD) return 3;
  if (confidence >= 0.35) return 2;
  return 1;
}
