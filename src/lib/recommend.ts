import { PRESET_CATEGORIES, type PresetCategory } from '@/lib/presets';

export interface PastSearch {
  query: string;
  sources: string[];
  /** Epoch millis of the run, when known. */
  at: number | null;
}

export interface Suggestion {
  domain: string;
  /** One short phrase saying why. The reason is the feature; a bare score teaches nothing. */
  reason: string;
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter((word) => word.length > 1);
}

/** Keyword match against the preset categories. Deterministic on purpose: demonstrable and debuggable. */
export function guessCategory(query: string): PresetCategory | null {
  const text = ` ${words(query).join(' ')} `;
  let best: PresetCategory | null = null;
  let bestHits = 0;
  for (const category of PRESET_CATEGORIES) {
    const hits = category.keywords.filter((keyword) => text.includes(` ${keyword} `) || text.includes(` ${keyword}s `)).length;
    if (hits > bestHits) {
      best = category;
      bestHits = hits;
    }
  }
  return best;
}

function ago(at: number | null, now: number): string {
  if (at === null) return 'before';
  const days = Math.floor((now - at) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

const KNOWN = 3;
const PRESET = 2;
const HISTORY = 1;

/**
 * Ranks domains for a query. Weight, highest first: the registry already knows
 * the page layout, the domain is in the matched preset, the user has priced
 * something like this there before. Each suggestion carries the reason with
 * the most weight behind it.
 * ponytail: the template's success/failure ratio is not weighed yet; add it
 * once RetailerTemplateDoc is read here rather than only "known".
 */
export function recommend(query: string, past: PastSearch[], known: Record<string, boolean>, now = Date.now()): Suggestion[] {
  if (!query.trim()) return [];
  const category = guessCategory(query);
  const queryWords = new Set(words(query));
  const scored = new Map<string, { score: number; best: number; reason: string }>();
  const add = (domain: string, weight: number, reason: string) => {
    const entry = scored.get(domain);
    if (!entry) return scored.set(domain, { score: weight, best: weight, reason });
    if (entry.best === weight) return; // one vote per signal
    entry.score += weight;
    if (weight > entry.best) Object.assign(entry, { best: weight, reason });
  };

  category?.domains.forEach((domain) => add(domain, PRESET, `In the ${category.name.toLowerCase()} preset`));

  for (const search of past) {
    const related =
      words(search.query).some((word) => queryWords.has(word)) ||
      (category !== null && guessCategory(search.query)?.id === category.id);
    if (related) search.sources.forEach((domain) => add(domain, HISTORY, `You priced ${search.query} here ${ago(search.at, now)}`));
  }

  for (const domain of [...scored.keys()]) {
    if (known[domain]) add(domain, KNOWN, 'Page layout already known');
  }

  return [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .map(([domain, { reason }]) => ({ domain, reason }));
}
