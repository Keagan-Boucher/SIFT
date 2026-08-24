/**
 * Firestore documents into the shapes the screens render. Keeping this in one
 * place is what lets the seeded demo dataset and the live stream drive the same
 * components.
 */

import { fmtPrice } from '@/lib/format-price';
import type { CandidateDoc, ListingDoc, SavedSearchDoc, SearchDoc, SourceStateDoc } from '@/types/firestore';
import type { CandidateView, NoteView, SavedItemView, SourceView, TileView } from '@/types/view';
import type { SourceStatus } from '@/components/sift/SourceChip';

const TIER_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'T1 · OFFICIAL API',
  2: 'T2 · INTERNAL JSON',
  3: 'T3 · STRUCTURED DATA',
  4: 'T4 · HEURISTIC HTML',
  5: 'T5 · HEADLESS RENDER',
};

/**
 * BLOCKED and FAILED are kept apart deliberately. BLOCKED means robots.txt
 * refused us, which will not change and gates the search. FAILED means this
 * query could not be read off that site, which another query might manage, so
 * it is reported without standing in the way. RESOLVING is still in flight.
 */
function sourceStatus(status: SourceStateDoc['status']): SourceStatus {
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'BLOCKED') return 'BLOCKED';
  if (status === 'FAILED') return 'FAILED';
  return 'PENDING';
}

/** Turns a domain into the retailer name shown on a tile: takealot.com -> Takealot. */
export function retailerName(domain: string): string {
  const label = domain.replace(/^www\./, '').split('.')[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function toSourceView(state: SourceStateDoc): SourceView {
  return { domain: state.domain, status: sourceStatus(state.status), reason: state.reason };
}

export function toTileView(listing: ListingDoc, lowestPrice: number): TileView {
  return {
    retailer: retailerName(listing.retailerDomain),
    domain: listing.retailerDomain,
    tier: listing.extractionTier,
    confidence: listing.confidenceBadge,
    price: fmtPrice(listing.price),
    value: listing.price,
    lowest: listing.price === lowestPrice,
    count: listing.needsConfirmation ? listing.candidates.length + 1 : undefined,
    issue: listing.needsConfirmation,
    title: listing.needsConfirmation ? `${listing.title} (unconfirmed match)` : listing.title,
    url: listing.url.replace(/^https?:\/\//, ''),
    method: TIER_LABEL[listing.extractionTier],
    stock: listing.inStock ? 'IN STOCK' : 'OUT OF STOCK',
  };
}

export function toTileViews(listings: ListingDoc[]): TileView[] {
  if (listings.length === 0) return [];
  const lowestPrice = Math.min(...listings.map((listing) => listing.price));
  return listings.map((listing) => toTileView(listing, lowestPrice));
}

export function toCandidateView(candidate: CandidateDoc): CandidateView {
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
 * automatically, plus the runners-up it beat, so the user compares like for like.
 */
export function toCandidateViews(listing: ListingDoc | null): CandidateView[] {
  if (!listing) return [];
  return [
    {
      title: listing.title,
      price: fmtPrice(listing.price),
      value: listing.price,
      confidence: listing.matchConfidence,
      url: listing.url,
    },
    ...listing.candidates.map(toCandidateView),
  ];
}

function relativeStamp(millis: number | null): string | null {
  if (millis === null) return null;
  const minutes = Math.max(0, Math.round((Date.now() - millis) / 60000));
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}:00 AGO`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}H AGO` : `${Math.round(hours / 24)}D AGO`;
}

export function toSavedItemView(saved: SavedSearchDoc): SavedItemView {
  const dropped = saved.previousLowestPrice !== null && saved.lowestPrice < saved.previousLowestPrice;
  return {
    id: saved.id,
    name: saved.query,
    value: saved.lowestPrice,
    sources: saved.sourceCount,
    dropTo: null,
    checked: saved.lastCheckedAt !== null,
    justDropped: dropped,
    lastChecked: relativeStamp(saved.lastCheckedAt?.toMillis() ?? null),
    wasValue: dropped ? (saved.previousLowestPrice ?? undefined) : undefined,
  };
}

/** A price drop the user has not seen yet becomes an alert banner. */
export function toDropNote(saved: SavedSearchDoc): NoteView | null {
  if (saved.previousLowestPrice === null || saved.lowestPrice >= saved.previousLowestPrice) return null;
  const percent = Math.round(((saved.previousLowestPrice - saved.lowestPrice) / saved.previousLowestPrice) * 1000) / 10;
  return {
    id: `drop-${saved.id}`,
    kind: 'drop',
    domain: saved.id,
    heading: 'PRICE_DROP',
    body: `${saved.query} fell to ${fmtPrice(saved.lowestPrice)} from ${fmtPrice(saved.previousLowestPrice)}, ${percent}% down.`,
  };
}

/** Sources that could not be scraped become alert banners explaining why. */
export function toSourceNotes(search: SearchDoc | null): NoteView[] {
  if (!search) return [];
  return search.sources
    .filter((state) => state.status === 'BLOCKED' || state.status === 'FAILED')
    .map((state) => ({
      id: `source-${state.domain}`,
      kind: 'block' as const,
      domain: state.domain,
      heading: state.status === 'BLOCKED' ? 'ROBOTS_BLOCKED' : 'EXTRACTION_FAILED',
      // The remedy differs: a robots refusal will not change, so the source has
      // to go. A failed read might work for a different query, so it stays.
      body:
        state.status === 'BLOCKED'
          ? `${state.domain}: ${state.reason ?? 'refuses automated access'}. Remove this source to continue.`
          : `${state.domain}: ${state.reason ?? 'could not be read'}. Other sources still compared.`,
    }));
}

/** A listing whose match confidence fell short becomes a prompt to confirm it. */
export function toConfirmNotes(listings: ListingDoc[]): NoteView[] {
  return listings
    .filter((listing) => listing.needsConfirmation)
    .map((listing) => ({
      id: `confirm-${listing.retailerDomain}`,
      kind: 'prompt' as const,
      domain: listing.retailerDomain,
      heading: 'CONFIRM_MATCH',
      body: `${listing.retailerDomain} matched at ${Math.round(listing.matchConfidence * 100)}%, which does not clear the 60% needed to trust it. Select that tile to resolve it.`,
    }));
}
