import { tokenize } from "./score";

/**
 * Words that describe a kind of product rather than identify one. A retailer's
 * search is usually a literal AND across terms, so one of these missing from the
 * product's own title is enough to return nothing at all.
 */
const GENERIC_TOKENS = new Set([
  "bundle", "pack", "packs", "set", "sets", "box", "boxed", "kit", "edition", "deck",
  "collection", "combo", "sealed", "official", "gaming", "gamer", "version", "model",
  "black", "white", "colour", "color",
]);

/** Longer tokens carry more identity, and a digit usually pins a variant. */
function distinctiveness(token: string): number {
  const digitBonus = /\d/.test(token) ? 3 : 0;
  const genericPenalty = GENERIC_TOKENS.has(token) ? 1 : 0;
  return digitBonus + Math.min(token.length, 10) / 10 - genericPenalty;
}

/**
 * Progressively less specific versions of a query, most specific first.
 *
 * Retailer search engines match literally: ask WooCommerce for
 * "Mtg Teenage Mutant turtles bundle" and it looks for every one of those words,
 * so a product actually listed as "Teenage Mutant Ninja Turtles - Prerelease
 * Pack" comes back as no results. Dropping the least distinctive words finds it.
 *
 * This only widens what the site is asked for. Scoring still runs against the
 * user's original query, so a broader result set cannot lower the bar for what
 * counts as a match.
 */
export function relaxedQueries(query: string): string[] {
  const tokens = tokenize(query);
  if (tokens.length <= 2) return [query];

  const ranked = [...tokens].sort((a, b) => distinctiveness(b) - distinctiveness(a));

  const variants: string[] = [];
  for (const keep of [3, 2]) {
    if (tokens.length <= keep) continue;
    const kept = new Set(ranked.slice(0, keep));
    // Emitted in the order the user typed them, which reads better in a URL and
    // suits engines that weight word order.
    variants.push(tokens.filter((token) => kept.has(token)).join(" "));
  }

  return [...new Set([query, ...variants])];
}
