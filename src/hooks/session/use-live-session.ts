import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  confirmMatch,
  createSearch,
  recheckSavedSearch,
  saveSearch,
  subscribeToListings,
  subscribeToRecentSearches,
  subscribeToSavedSearches,
  subscribeToSearch,
  updateSearchProgress,
} from '@/lib/searches';
import { toAlerts, toCandidateViews, toSavedItemView, toSearchSummary, toSourceView, toTileViews } from '@/lib/map-to-view';
import { isDomainKnown } from '@/lib/registry';
import type { ListingDoc, SavedSearchDoc, SearchDoc } from '@/types/firestore';
import type { SearchSummary, SourceView, Step } from '@/types/view';
import type { SiftSession } from './types';

const NO_SOURCES: SourceView[] = [];

/**
 * The live session. The client writes a search document and subscribes; the
 * Cloud Function trigger resolves, extracts and streams state back onto that
 * document, which is what makes rows fill in one at a time.
 */
export function useLiveSession(userId: string | null): SiftSession {
  const [stagedSources, setStagedSources] = useState<SourceView[]>(NO_SOURCES);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchDoc | null>(null);
  const [listings, setListings] = useState<ListingDoc[]>([]);
  const [savedDocs, setSavedDocs] = useState<SavedSearchDoc[]>([]);
  const [recentDocs, setRecentDocs] = useState<SearchDoc[]>([]);
  const [confirmDomain, setConfirmDomain] = useState<string | null>(null);
  /** Domains the user delisted from this run. The listener keeps sending them, so they are filtered on the way out. */
  const [discarded, setDiscarded] = useState<string[]>([]);
  /** Domains whose automatic pick the user accepted. Nothing changes server-side, so it is remembered here. */
  const [accepted, setAccepted] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  // Delisted sources are gone from every read of the run: rows, alerts, saving.
  const shown = useMemo(
    () =>
      listings
        .filter((listing) => !discarded.includes(listing.retailerDomain))
        .map((listing) => (accepted.includes(listing.retailerDomain) ? { ...listing, needsConfirmation: false } : listing)),
    [listings, discarded, accepted],
  );

  // The lowest price so far rides on the search document, so the home screen's
  // resume card and history rows need no listings query of their own. Losing
  // this write only costs that figure on the home screen, so it never errors.
  const lowest = shown.length > 0 ? Math.min(...shown.map((listing) => listing.price)) : null;
  const written = useRef<string | null>(null);
  useEffect(() => {
    if (!searchId || lowest === null || written.current === `${searchId}:${lowest}`) return;
    written.current = `${searchId}:${lowest}`;
    updateSearchProgress(searchId, { lowestPrice: lowest }).catch(() => {});
  }, [searchId, lowest]);

  const setStep = useCallback(
    (step: Step) => {
      if (searchId) updateSearchProgress(searchId, { step }).catch(() => {});
    },
    [searchId],
  );

  const startSearch = useCallback(
    (query: string, urls: Record<string, string>) => {
      if (!userId || stagedSources.length === 0) return;
      setError(null);
      setConfirmDomain(null);
      setDiscarded([]);
      setAccepted([]);
      setListings([]);
      setSearch(null);
      createSearch(
        userId,
        query,
        stagedSources.map((source) => source.domain),
        urls,
      )
        .then(setSearchId)
        .catch(fail);
    },
    [userId, stagedSources, fail],
  );

  // Pasted URLs ride along on every re-run of this search, so fixing a second
  // source does not lose the first.
  const runSearch = useCallback((query: string) => startSearch(query, search?.userSearchUrls ?? {}), [startSearch, search]);

  const retryWithUrl = useCallback(
    (query: string, domain: string, url: string) => startSearch(query, { ...search?.userSearchUrls, [domain]: url }),
    [startSearch, search],
  );

  const resumeSearch = useCallback((summary: SearchSummary) => {
    setStagedSources(summary.sources.map((domain) => ({ domain, status: 'PENDING' })));
    setConfirmDomain(null);
    setDiscarded([]);
    setAccepted([]);
    setListings([]);
    setSearch(null);
    setSearchId(summary.id);
  }, []);

  const confirmCandidate = useCallback(
    (index: number) => {
      const listing = listings.find((item) => item.retailerDomain === confirmDomain);
      const candidate = toCandidateViews(listing ?? null)[index];
      setConfirmDomain(null);
      if (!searchId || !listing || !candidate?.url) return;
      // The automatic pick is not among its own runners-up, so the callable has nothing to promote.
      if (candidate.url === listing.url) return setAccepted((domains) => [...domains, listing.retailerDomain]);
      confirmMatch(searchId, listing.retailerDomain, candidate.url).catch(fail);
    },
    [searchId, listings, confirmDomain, fail],
  );

  const discardConfirmSource = useCallback(() => {
    if (confirmDomain) setDiscarded((domains) => [...domains, confirmDomain]);
    setConfirmDomain(null);
  }, [confirmDomain]);

  const dropSource = useCallback((domain: string) => {
    setDiscarded((domains) => [...domains, domain]);
    setStagedSources((sources) => sources.filter((source) => source.domain !== domain));
  }, []);

  const saveCurrentSearch = useCallback(
    (query: string) => {
      if (!userId || lowest === null) return;
      saveSearch(
        userId,
        query,
        shown.map((listing) => listing.retailerDomain),
        lowest,
      ).catch(fail);
    },
    [userId, shown, lowest, fail],
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
    // A site someone else already solved needs no resolving. Never fatal: it only upgrades the row.
    isDomainKnown(domain)
      .then((known) => {
        if (!known) return;
        setStagedSources((sources) =>
          sources.map((source) =>
            source.domain === domain && source.status === 'PENDING' ? { ...source, status: 'KNOWN' } : source,
          ),
        );
      })
      .catch(() => {});
  }, []);

  const removeSource = useCallback((domain: string) => {
    setStagedSources((sources) => sources.filter((source) => source.domain !== domain));
  }, []);

  const setSources = useCallback(
    (domains: string[]) => {
      setStagedSources(NO_SOURCES);
      domains.forEach(addSource);
    },
    [addSource],
  );

  const resetSources = useCallback(() => {
    setStagedSources(NO_SOURCES);
    setSearchId(null);
    setSearch(null);
    setListings([]);
    setConfirmDomain(null);
    setDiscarded([]);
    setAccepted([]);
    setError(null);
  }, []);

  // Before a run the sources are whatever the user staged. During and after one
  // the pipeline owns their status, so the search document wins.
  const sources = useMemo<SourceView[]>(() => {
    if (!search) return stagedSources;
    const live = new Map(
      search.sources.filter((state) => typeof state === 'object').map((state) => [state.domain, toSourceView(state)]),
    );
    return stagedSources.filter((staged) => !discarded.includes(staged.domain)).map((staged) => live.get(staged.domain) ?? staged);
  }, [search, stagedSources, discarded]);

  // Newest run of each query only: re-running the same search refreshes its row.
  const searches = useMemo(() => {
    const seen = new Set<string>();
    return recentDocs.filter((doc) => !seen.has(doc.query) && seen.add(doc.query)).map(toSearchSummary);
  }, [recentDocs]);

  const alerts = useMemo(() => {
    const visible = search ? { ...search, sources: search.sources.filter((state) => !discarded.includes(state.domain)) } : null;
    return toAlerts(visible, shown, savedDocs);
  }, [search, shown, savedDocs, discarded]);

  const running = search?.status === 'pending' || search?.status === 'resolving' || search?.status === 'extracting';

  return useMemo<SiftSession>(
    () => ({
      error,
      searchId,
      sources,
      tiles: toTileViews(shown),
      saved: savedDocs.map(toSavedItemView),
      searches,
      candidates: toCandidateViews(listings.find((item) => item.retailerDomain === confirmDomain) ?? null),
      confirmDomain,
      alerts,
      running: !!running,
      complete: search?.status === 'complete' || search?.status === 'failed',
      addSource,
      removeSource,
      setSources,
      resetSources,
      runSearch,
      retryWithUrl,
      resumeSearch,
      dropSource,
      beginConfirm: setConfirmDomain,
      confirmCandidate,
      discardConfirmSource,
      saveCurrentSearch,
      checkSaved,
      checkAllSaved,
      setStep,
    }),
    [
      error,
      searchId,
      sources,
      shown,
      listings,
      savedDocs,
      searches,
      confirmDomain,
      alerts,
      running,
      search?.status,
      addSource,
      removeSource,
      setSources,
      resetSources,
      runSearch,
      retryWithUrl,
      resumeSearch,
      dropSource,
      confirmCandidate,
      discardConfirmSource,
      saveCurrentSearch,
      checkSaved,
      checkAllSaved,
      setStep,
    ],
  );
}
