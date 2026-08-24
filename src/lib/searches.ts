import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query as fsQuery,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '@/lib/firebase';
import type { ListingDoc, PricePointDoc, SavedSearchDoc, SearchDoc } from '@/types/firestore';

/**
 * Creates the search the pipeline reacts to. The client writes the document and
 * nothing else; the Cloud Function trigger does the resolving and extracting and
 * streams state back onto the same document.
 */
export async function createSearch(
  userId: string,
  query: string,
  sources: string[],
  userSearchUrls?: Record<string, string>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'searches'), {
    userId,
    query: query.trim(),
    sources,
    ...(userSearchUrls && Object.keys(userSearchUrls).length > 0 ? { userSearchUrls } : {}),
    status: 'pending',
    resolvedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Live per-source progress: this is what makes the live screen move. */
export function subscribeToSearch(
  searchId: string,
  onChange: (search: SearchDoc | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'searches', searchId),
    (snapshot) => onChange(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SearchDoc) : null),
    onError,
  );
}

/** Live listings for a search, cheapest first, arriving one per source as they land. */
export function subscribeToListings(
  searchId: string,
  onChange: (listings: ListingDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    fsQuery(collection(db, 'listings'), where('searchId', '==', searchId), orderBy('price', 'asc')),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ListingDoc)),
    onError,
  );
}

/** The user's recent searches, newest first, backing the recents rail. */
export function subscribeToRecentSearches(
  userId: string,
  onChange: (searches: SearchDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    fsQuery(collection(db, 'searches'), where('userId', '==', userId), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SearchDoc)),
    onError,
  );
}

export function subscribeToSavedSearches(
  userId: string,
  onChange: (saved: SavedSearchDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    fsQuery(collection(db, 'savedSearches'), where('userId', '==', userId), orderBy('updatedAt', 'desc')),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedSearchDoc)),
    onError,
  );
}

/** Price history for one watched search, oldest first, feeding the history bars. */
export function subscribeToPriceHistory(
  savedSearchId: string,
  onChange: (points: PricePointDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    fsQuery(collection(db, 'savedSearches', savedSearchId, 'pricePoints'), orderBy('observedAt', 'asc')),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PricePointDoc)),
    onError,
  );
}

/** Watches a search, so the scheduled recheck starts tracking its lowest price. */
export async function saveSearch(
  userId: string,
  query: string,
  sources: string[],
  lowestPrice: number,
): Promise<string> {
  // Keyed on user and query so watching the same search twice updates rather than duplicates.
  const id = `${userId}__${query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 1400);
  await setDoc(
    doc(db, 'savedSearches', id),
    {
      userId,
      query: query.trim(),
      sources,
      lowestPrice,
      previousLowestPrice: null,
      sourceCount: sources.length,
      lastCheckedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function unsaveSearch(savedSearchId: string): Promise<void> {
  await deleteDoc(doc(db, 'savedSearches', savedSearchId));
}

const confirmMatchCallable = httpsCallable<
  { searchId: string; domain: string; candidateUrl: string },
  { ok: true }
>(functions, 'confirmMatch');

/** Promotes the candidate the user picked in the confirm step. */
export async function confirmMatch(searchId: string, domain: string, candidateUrl: string): Promise<void> {
  await confirmMatchCallable({ searchId, domain, candidateUrl });
}

const recheckCallable = httpsCallable<{ savedSearchId: string }, { lowestPrice: number | null }>(
  functions,
  'recheckSavedSearch',
);

/** Re-runs a watched search now instead of waiting for the scheduled sweep. */
export async function recheckSavedSearch(savedSearchId: string): Promise<number | null> {
  const result = await recheckCallable({ savedSearchId });
  return result.data.lowestPrice;
}
