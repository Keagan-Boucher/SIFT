import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  confirmMatch,
  createSearch,
  recheckSavedSearch,
  saveSearch,
  subscribeToListings,
  subscribeToPriceHistory,
  subscribeToRecentSearches,
  subscribeToSavedSearches,
  subscribeToSearch,
} from '@/lib/searches';
import {
  toCandidateViews,
  toConfirmNotes,
  toDropNote,
  toSavedItemView,
  toSourceNotes,
  toSourceView,
  toTileViews,
} from '@/lib/map-to-view';
import type { ListingDoc, SavedSearchDoc, SearchDoc } from '@/types/firestore';
import type { NoteView, RecentView, SourceView } from '@/types/view';
import type { SiftSession } from './types';

/** Sources the user has staged but not yet searched with. */
const NO_SOURCES: SourceView[] = [];

function recentLabel(search: SearchDoc): RecentView {
  const resolved = search.resolvedCount ?? 0;
  const meta =
    search.status === 'complete'
      ? `${resolved} PRICES · ${search.sources.length} SOURCES`
      : search.status.toUpperCase();
  return { name: search.query, meta };
}

/**
 * The live session. The client writes a search document and subscribes; the
 * Cloud Function trigger resolves, extracts and streams state back onto that
 * document, which is what makes tiles appear one by one rather than in a batch.
 */
export function useLiveSession(userId: string | null): SiftSession {
  const [stagedSources, setStagedSources] = useState<SourceView[]>(NO_SOURCES);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchDoc | null>(null);
  const [listings, setListings] = useState<ListingDoc[]>([]);
  const [savedDocs, setSavedDocs] = useState<SavedSearchDoc[]>([]);
  const [recentDocs, setRecentDocs] = useState<SearchDoc[]>([]);
  const [historyFor, setHistoryFor] = useState<{ savedSearchId: string; points: number[] } | null>(null);
  const [confirmDomain, setConfirmDomain] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Search URLs pasted for domains resolution could not work out on its own, keyed by domain. */
  const [userSearchUrls, setUserSearchUrls] = useState<Record<string, string>>({});

  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : String(cause));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsubscribeSaved = subscribeToSavedSearches(userId, setSavedDocs, fail);
    const unsubscribeRecent = subscribeToRecentSearches(userId, setRecentDocs, fail);
    return () => {
      unsubscribeSaved();
      unsubscribeRecent();
    };
  }, [userId, fail]);

  useEffect(() => {
    if (!searchId) return;
    const unsubscribeSearch = subscribeToSearch(searchId, setSearch, fail);
    const unsubscribeListings = subscribeToListings(searchId, setListings, fail);
    return () => {
      unsubscribeSearch();
      unsubscribeListings();
    };
  }, [searchId, fail]);

  // History follows whichever watched search matches the query on screen, so the
  // dashboard bars show that product's own past rather than a generic series.
  const watchedId = (savedDocs.find((saved) => saved.query === activeQuery) ?? savedDocs[0])?.id ?? null;

  useEffect(() => {
    if (!watchedId) return;
    return subscribeToPriceHistory(
      watchedId,
      (points) => setHistoryFor({ savedSearchId: watchedId, points: points.map((point) => point.price) }),
      fail,
    );
  }, [watchedId, fail]);

  // Guarded by id so a stale series never renders under a different product.
  const history = useMemo(
    () => (historyFor?.savedSearchId === watchedId ? historyFor.points : []),
    [historyFor, watchedId],
  );

  /** Shared by a normal run and a Method D retry, which needs to pass URLs before the state update carrying them has landed. */
  const startSearch = useCallback(
    (query: string, urls: Record<string, string>) => {
      if (!userId || stagedSources.length === 0) return;
      setActiveQuery(query);
      setError(null);
      setConfirmDomain(null);
      setListings([]);
      setSearch(null);

      // Consumed on use: once a run is fired with them, the LINKS panel should
      // empty out rather than keep offering the same URLs for the next retry.
      setUserSearchUrls({});

      createSearch(
        userId,
        query,
        stagedSources.filter((source) => source.status !== 'BLOCKED').map((source) => source.domain),
        urls,
      )
        .then(setSearchId)
        .catch(fail);
    },
    [userId, stagedSources, fail],
  );

  const runSearch = useCallback((query: string) => startSearch(query, userSearchUrls), [startSearch, userSearchUrls]);

  // Stages the URL only: retrying immediately would mean submitting one of
  // several FAILED sources' URLs re-runs the search before the rest are in.
  // runSearch (or another provideSearchUrl call) picks up everything staged.
  const provideSearchUrl = useCallback((domain: string, url: string) => {
    setUserSearchUrls((urls) => ({ ...urls, [domain]: url }));
  }, []);

  const confirmCandidate = useCallback(
    (index: number) => {
      const listing = listings.find((item) => item.retailerDomain === confirmDomain);
      const candidate = toCandidateViews(listing ?? null)[index];
      if (!searchId || !listing || !candidate?.url) return;
      // Index 0 is the automatic pick, so confirming it needs no write.
      if (candidate.url === listing.url) {
        setConfirmDomain(null);
        return;
      }
      confirmMatch(searchId, listing.retailerDomain, candidate.url).catch(fail);
      setConfirmDomain(null);
    },
    [searchId, listings, confirmDomain, fail],
  );

  const saveCurrentSearch = useCallback(
    (query: string) => {
      const lowest = listings[0]?.price;
      if (!userId || lowest === undefined) return;
      saveSearch(
        userId,
        query,
        listings.map((listing) => listing.retailerDomain),
        lowest,
      ).catch(fail);
    },
    [userId, listings, fail],
  );

  const checkSaved = useCallback(
    (savedId: string) => {
      recheckSavedSearch(savedId).catch(fail);
    },
    [fail],
  );

  const checkAllSaved = useCallback(() => {
    savedDocs.forEach((saved) => recheckSavedSearch(saved.id).catch(fail));
  }, [savedDocs, fail]);

  const addSource = useCallback((domain: string) => {
    setStagedSources((sources) =>
      sources.some((source) => source.domain === domain) ? sources : [...sources, { domain, status: 'PENDING' }],
    );
  }, []);

  const removeSource = useCallback((domain: string) => {
    setStagedSources((sources) => sources.filter((source) => source.domain !== domain));
  }, []);

  /**
   * Dropping the search id also drops everything that hung off it, including
   * the search document itself. Before it goes, whatever the pipeline actually
   * found is folded into stagedSources, so leaving the live screen does not
   * revert a source that resolved back to PENDING on the sources screen.
   */
  const clearSearch = useCallback(() => {
    setStagedSources((current) => {
      if (!search) return current;
      const live = new Map(search.sources.map((state) => [state.domain, toSourceView(state)]));
      return current.map((staged) => live.get(staged.domain) ?? staged);
    });
    setSearchId(null);
    setSearch(null);
    setListings([]);
    setConfirmDomain(null);
  }, [search]);

  const resetSources = useCallback(() => {
    setStagedSources(NO_SOURCES);
    setUserSearchUrls({});
    clearSearch();
    setError(null);
  }, [clearSearch]);

  const cancelSearch = clearSearch;

  // Before a run the sources are whatever the user staged. During and after one
  // the pipeline owns their status, so the search document wins.
  const sources = useMemo<SourceView[]>(() => {
    if (!search) return stagedSources;
    const live = new Map(search.sources.map((state) => [state.domain, toSourceView(state)]));
    return stagedSources.map((staged) => live.get(staged.domain) ?? staged);
  }, [search, stagedSources]);

  const notes = useMemo<NoteView[]>(() => {
    const dropNotes = savedDocs.map(toDropNote).filter((note): note is NoteView => note !== null);
    return [...toSourceNotes(search), ...toConfirmNotes(listings), ...dropNotes];
  }, [search, listings, savedDocs]);

  const running = search?.status === 'pending' || search?.status === 'resolving' || search?.status === 'extracting';

  return useMemo<SiftSession>(
    () => ({
      mode: 'live',
      error,
      sources,
      tiles: toTileViews(listings),
      saved: savedDocs.map(toSavedItemView),
      recents: recentDocs.slice(0, 4).map(recentLabel),
      candidates: toCandidateViews(listings.find((item) => item.retailerDomain === confirmDomain) ?? null),
      notes,
      stagedUrls: userSearchUrls,
      history,
      running: !!running,
      complete: search?.status === 'complete' || search?.status === 'failed',
      addSource,
      removeSource,
      resetSources,
      runSearch,
      provideSearchUrl,
      cancelSearch,
      beginConfirm: setConfirmDomain,
      confirmCandidate,
      saveCurrentSearch,
      checkSaved,
      checkAllSaved,
    }),
    [
      error,
      sources,
      listings,
      savedDocs,
      recentDocs,
      confirmDomain,
      notes,
      userSearchUrls,
      history,
      running,
      search?.status,
      addSource,
      removeSource,
      resetSources,
      runSearch,
      provideSearchUrl,
      cancelSearch,
      confirmCandidate,
      saveCurrentSearch,
      checkSaved,
      checkAllSaved,
    ],
  );
}
