/**
 * Firestore documents into the shapes the screens render. Keeping this in one
 * place is what keeps raw document shapes out of the view components.
 */

import { fmtPrice } from '@/lib/format-price';
import type { CandidateDoc, ListingDoc, SavedSearchDoc, SearchDoc, SourceStateDoc } from '@/types/firestore';
import type { AlertView, CandidateView, ErrorKind, SavedItemView, SearchSummary, SourceView, TileView } from '@/types/view';

export const STEP_NUMBER = { sources: 1, scan: 2, confirm: 3, compare: 4 } as const;

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "Three", for counts in sentences. Past ten, digits read better. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** Below this a match is not trusted without the user. Mirrors the pipeline's threshold. */
export const CONFIRM_THRESHOLD = 0.6;

/** What each failure looks like in a row, and the fix offered beside it. */
export const ERROR_COPY: Record<ErrorKind, { reason: string; fix: string }> = {
  blocked: { reason: 'Blocked the scan', fix: 'RETRY' },
  'no-results': { reason: 'No search results', fix: 'PASTE URL' },
  'weak-match': { reason: 'Weak match, pick one', fix: 'PICK' },
  timeout: { reason: 'Timed out', fix: 'RETRY' },
};

/**
 * BLOCKED means the site refused the request. FAILED means no readable search
 * page was found, unless the reason says the function ran out of time.
 */
export function errorKind(status: SourceStateDoc['status'], reason?: string): ErrorKind | undefined {
  if (status === 'BLOCKED') return 'blocked';
  if (status !== 'FAILED') return undefined;
  return reason && /time ?out|timed out|deadline/i.test(reason) ? 'timeout' : 'no-results';
}

export function toSourceView(state: SourceStateDoc): SourceView {
  return { domain: state.domain, status: state.status, reason: state.reason, kind: errorKind(state.status, state.reason) };
}

export function toTileViews(listings: ListingDoc[]): TileView[] {
  if (listings.length === 0) return [];
  const lowestPrice = Math.min(...listings.map((listing) => listing.price));
  return listings.map((listing) => ({
    domain: listing.retailerDomain,
    title: listing.title,
    price: fmtPrice(listing.price),
    value: listing.price,
    lowest: listing.price === lowestPrice,
    issue: listing.needsConfirmation && !listing.confirmedByUser,
    // Kept whole: tapping a row opens it in a browser.
    url: listing.url,
  }));
}

function toCandidateView(candidate: CandidateDoc): CandidateView {
  return {
    title: candidate.title,
    price: fmtPrice(candidate.price),
    value: candidate.price,
    confidence: candidate.matchConfidence,
    url: candidate.url,
  };
}

/**
 * The candidates for the confirm step: the listing that was picked
 * automatically, plus the runners-up it beat, best first, three at most.
 */
export function toCandidateViews(listing: ListingDoc | null): CandidateView[] {
  if (!listing) return [];
  return [
    { title: listing.title, price: fmtPrice(listing.price), value: listing.price, confidence: listing.matchConfidence, url: listing.url },
    ...listing.candidates.map(toCandidateView),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/** "2 MIN AGO", "3 H AGO", "YESTERDAY", "4 DAYS AGO". */
export function relativeStamp(millis: number | null): string | null {
  if (millis === null) return null;
  const minutes = Math.max(0, Math.round((Date.now() - millis) / 60000));
  if (minutes < 1) return 'NOW';
  if (minutes < 60) return `${minutes} MIN AGO`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} H AGO`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'YESTERDAY' : `${days} DAYS AGO`;
}

export function toSavedItemView(saved: SavedSearchDoc): SavedItemView {
  const dropped = saved.previousLowestPrice !== null && saved.lowestPrice < saved.previousLowestPrice;
  return {
    id: saved.id,
    name: saved.query,
    value: saved.lowestPrice,
    sources: saved.sourceCount,
    checked: saved.lastCheckedAt !== null,
    justDropped: dropped,
    lastChecked: relativeStamp(saved.lastCheckedAt?.toMillis() ?? null),
    wasValue: dropped ? (saved.previousLowestPrice ?? undefined) : undefined,
  };
}

const ALERT_MESSAGE: Record<ErrorKind, (domain: string) => string> = {
  blocked: (domain) => `${domain} blocked the scan`,
  'no-results': (domain) => `${domain} needs a search URL`,
  'weak-match': (domain) => `${domain} needs you to pick the match`,
  timeout: (domain) => `${domain} timed out`,
};

/** Every source that needs the user, plus any watched price that dropped, as one inbox. */
export function toAlerts(search: SearchDoc | null, listings: ListingDoc[], saved: SavedSearchDoc[]): AlertView[] {
  const at = search?.updatedAt?.toMillis?.() ?? null;
  const sourceAlerts: AlertView[] = (search?.sources ?? []).flatMap((state) => {
    const kind = errorKind(state.status, state.reason);
    return kind ? [{ id: `source-${search?.id}-${state.domain}`, kind, domain: state.domain, message: ALERT_MESSAGE[kind](state.domain), at }] : [];
  });
  const weak: AlertView[] = listings
    .filter((listing) => listing.needsConfirmation && !listing.confirmedByUser)
    .map((listing) => ({
      id: `weak-${listing.searchId}-${listing.retailerDomain}`,
      kind: 'weak-match' as const,
      domain: listing.retailerDomain,
      message: ALERT_MESSAGE['weak-match'](listing.retailerDomain),
      at,
    }));
  const drops: AlertView[] = saved
    .filter((item) => item.previousLowestPrice !== null && item.lowestPrice < item.previousLowestPrice)
    .map((item) => ({
      id: `drop-${item.id}-${item.lowestPrice}`,
      kind: 'drop' as const,
      message: `${item.query} dropped to ${fmtPrice(item.lowestPrice)}`,
      at: item.lastCheckedAt?.toMillis() ?? null,
    }));
  return [...sourceAlerts, ...weak, ...drops];
}

/**
 * Searches from before the redesign carry no step, so the pipeline status
 * stands in: a run still going is resumable, anything settled is finished.
 */
export function toSearchSummary(search: SearchDoc): SearchSummary {
  const running = search.status === 'pending' || search.status === 'resolving' || search.status === 'extracting';
  const step = search.step ?? (running ? 'scan' : 'compare');
  return {
    id: search.id,
    query: search.query,
    step,
    finished: step === 'compare',
    lowest: search.lowestPrice ?? null,
    at: search.createdAt?.toMillis?.() ?? null,
    // A brand-new search holds bare domains until the pipeline first writes its states back.
    sources: (search.sources as (SourceStateDoc | string)[]).map((source) => (typeof source === 'string' ? source : source.domain)),
  };
}
