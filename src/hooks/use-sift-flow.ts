import { useCallback, useMemo } from 'react';

import { SiftColors } from '@/constants/sift-theme';
import { fmtPrice } from '@/lib/format-price';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useLiveSession } from '@/hooks/session/use-live-session';
import { useFlowStore, type Screen } from '@/store/useFlowStore';
import type { RecentView } from '@/types/view';

export type { Screen };

/** True middle of a series: the average of the two middle values on an even count. */
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Trims a pasted URL down to the bare domain the backend expects. */
function toDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '');
}

export function useSiftFlow() {
  const state = useFlowStore();

  const auth = useAuth();
  const session = useLiveSession(auth.user?.uid ?? null);
  // Without a project there is nothing behind the screens: they render empty
  // and the account panel says why.
  const noProject = !isFirebaseConfigured;

  const { setScreen, setQuery, setInput, toggleArchive, toggleAccount, toggleLinks, openRetry, closeRetry, openDiscard, closeDiscard } = state;
  /** Reuses a past search: its query, plus its sources merged into whatever is already staged. */
  const chooseRecent = useCallback(
    (recent: RecentView) => {
      setQuery(recent.name);
      recent.sources.forEach(session.addSource);
    },
    [setQuery, session],
  );
  const selectTile = useCallback((index: number) => state.select(index), [state]);
  const closeListing = useCallback(() => state.select(null), [state]);
  const chooseCandidate = useCallback((index: number) => state.choose(index), [state]);
  const openSaved = useCallback(() => setScreen('saved'), [setScreen]);

  const addSourceFromInput = useCallback(() => {
    const domain = toDomain(state.input);
    if (domain) session.addSource(domain);
    setInput('');
  }, [session, state.input, setInput]);

  const removeSource = useCallback(
    (domain: string) => {
      session.removeSource(domain);
    },
    [session],
  );

  const resetSources = useCallback(() => {
    session.resetSources();
    setInput('');
    state.clearArchive();
  }, [session, setInput, state]);

  const runSearch = useCallback(() => {
    session.runSearch(state.query);
    state.select(null);
    state.choose(0);
    setScreen('live');
  }, [session, state, setScreen]);

  // Method D: stages a search URL pasted for one FAILED source. Multiple
  // sources can each get one before retrying, so this only closes the popup;
  // runSearch (the existing RETRY SEARCH action) is what re-runs with them.
  const submitRetryUrl = useCallback(
    (domain: string, url: string) => {
      session.provideSearchUrl(domain, url.trim());
      closeRetry();
    },
    [session, closeRetry],
  );

  const backToSourcesFromLive = useCallback(() => {
    session.cancelSearch();
    state.select(null);
    setScreen('sources');
  }, [session, state, setScreen]);

  /** Notes the user has dismissed move to the archive rather than disappearing. */
  const dismissNote = useCallback(
    (id: string) => {
      const note = session.notes.find((n) => n.id === id);
      if (note) state.archive(note, 'THIS SESSION');
    },
    [session.notes, state],
  );

  const openConfirm = useCallback(
    (domain: string) => {
      session.beginConfirm(domain);
      state.choose(0);
      state.select(null);
      setScreen('confirm');
    },
    [session, state, setScreen],
  );

  const confirmMatches = useCallback(() => {
    session.confirmCandidate(state.chosen);
    state.select(null);
    setScreen('live');
  }, [session, state, setScreen]);

  /** Nothing this source returned matched: delist it and go back to the run. */
  const discardConfirmSource = useCallback(() => {
    session.discardConfirmSource();
    closeDiscard();
    state.select(null);
    setScreen('live');
  }, [session, state, setScreen, closeDiscard]);

  const saveCurrentSearch = useCallback(() => {
    session.saveCurrentSearch(state.query);
  }, [session, state.query]);

  const checkItem = useCallback((id: string) => session.checkSaved(id), [session]);
  const checkAll = useCallback(() => session.checkAllSaved(), [session]);

  const derived = useMemo(() => {
    const { screen, selected, chosen, dismissed, showArchive, showAccount, showLinks } = state;
    const { tiles, sources, saved, recents, candidates, running, complete, history } = session;

    const dismissedIds = new Set(dismissed.map((note) => note.id));
    const notes = session.notes.filter((note) => !dismissedIds.has(note.id));

    // Collapsed behind its own chip, same shape AlertLogPopup already renders.
    const stagedLinks = Object.entries(session.stagedUrls).map(([domain, url]) => ({
      id: `staged-${domain}`,
      label: '>LINK_ADDED',
      stamp: domain,
      body: url,
    }));

    const resolved = tiles.length;
    const sorted = [...tiles].sort((a, b) => a.value - b.value);
    const cheapest = sorted[0];
    const dearest = sorted[sorted.length - 1];
    const spread =
      sorted.length > 1 ? Math.round(((dearest.value - cheapest.value) / cheapest.value) * 1000) / 10 : 0;

    // Only a robots refusal gates a search. A source that could not be read for
    // this query is reported but stays, since another query may well work.
    const blockedSources = sources.filter((source) => source.status === 'BLOCKED').length;
    const failedSources = sources.filter((source) => source.status === 'FAILED').length;
    const openIssues = tiles.filter((tile) => tile.issue).length;
    const selectedTile = selected !== null ? (tiles[selected] ?? null) : null;
    const selectedIssue = !!selectedTile?.issue;
    const droppedCount = saved.filter((item) => item.justDropped).length;

    const railName: Record<Screen, string> = {
      sources: 'ADD SOURCES',
      live: 'LIVE RESULTS',
      confirm: 'CONFIRM MATCHES',
      results: 'LIVE RESULTS',
      dashboard: 'DASHBOARD',
      saved: 'SAVED SEARCHES',
    };

    const statusLine: Record<Screen, string> = {
      sources:
        blockedSources > 0
          ? `${blockedSources} BLOCKED · REMOVE TO CONTINUE`
          : failedSources > 0
            ? `${sources.length} SOURCES · ${failedSources} UNREADABLE`
            : `${sources.length} SOURCES · ${noProject ? 'NO PROJECT' : 'IDLE'}`,
      live: running
        ? `${resolved}/${sources.length} RESOLVED · LIVE`
        : openIssues > 0
          ? `${openIssues} TO REVIEW · SELECT TO RESOLVE`
          : `${resolved} PRICES · COMPLETE`,
      confirm: `${candidates.length} CANDIDATES · IDLE`,
      results: `${resolved} PRICES · COMPLETE`,
      dashboard: `${resolved} PRICES · SPREAD ${spread}%`,
      saved: droppedCount > 0 ? `${droppedCount} DROPPED · REVIEW` : `${saved.length} WATCHED · IDLE`,
    };

    const nav: Record<
      Screen,
      { primaryLabel: string; primaryAction: () => void; primaryDisabled?: boolean; secondaryLabel: string; secondaryAction: () => void }
    > = {
      sources: {
        primaryLabel: 'RUN SEARCH',
        primaryAction: runSearch,
        primaryDisabled: blockedSources > 0 || sources.length === 0 || state.query.trim().length === 0,
        secondaryLabel: 'RESET',
        secondaryAction: resetSources,
      },
      live: {
        primaryLabel: !complete
          ? 'SEARCH RUNNING'
          : selectedIssue
            ? 'RESOLVE ISSUE'
            : stagedLinks.length > 0
              ? 'RETRY SEARCH'
              : 'CONFIRM MATCHES',
        primaryAction: () => {
          if (selectedIssue && selectedTile) openConfirm(selectedTile.domain);
          else if (stagedLinks.length > 0) runSearch();
          else setScreen('results');
        },
        // RETRY SEARCH doesn't need confirm-match issues resolved first, they're
        // unrelated problems. With nothing staged there is nothing to retry, so
        // this is CONFIRM MATCHES again and its original gate applies as before:
        // a FAILED source alone (no link given for it yet) still needs that.
        primaryDisabled: !complete || (!selectedIssue && stagedLinks.length === 0 && openIssues > 0),
        secondaryLabel: 'BACK',
        secondaryAction: backToSourcesFromLive,
      },
      confirm: {
        primaryLabel: 'CONFIRM MATCH',
        primaryAction: confirmMatches,
        primaryDisabled: candidates.length === 0,
        secondaryLabel: 'BACK',
        secondaryAction: () => setScreen('live'),
      },
      results: { primaryLabel: 'VIEW SPREAD', primaryAction: () => setScreen('dashboard'), secondaryLabel: 'BACK', secondaryAction: () => setScreen('live') },
      dashboard: {
        primaryLabel: 'SAVE SEARCH',
        primaryAction: () => {
          saveCurrentSearch();
          setScreen('saved');
        },
        secondaryLabel: 'BACK',
        secondaryAction: () => setScreen('results'),
      },
      saved: {
        primaryLabel: 'CHECK ALL',
        primaryAction: checkAll,
        primaryDisabled: saved.length === 0 || saved.every((item) => item.checked),
        secondaryLabel: 'BACK',
        secondaryAction: () => setScreen('sources'),
      },
    };

    // A flat history draws no bars, so a single observation sits mid-height.
    const historyMin = Math.min(...history);
    const historyRange = Math.max(...history) - historyMin;
    const historyBars = history.map((value, index) => ({
      heightPx: 14 + (historyRange > 0 ? ((value - historyMin) / historyRange) * 46 : 23),
      isToday: index === history.length - 1,
    }));

    const priceRange = sorted.length > 1 ? dearest.value - cheapest.value : 0;
    const ladder = sorted.map((tile) => ({
      label: tile.retailer.toUpperCase(),
      price: tile.price,
      widthPct: 10 + (priceRange > 0 ? ((tile.value - cheapest.value) / priceRange) * 90 : 90),
      color:
        tile.value === cheapest.value
          ? SiftColors.mint
          : tile.value === dearest.value
            ? SiftColors.ember
            : SiftColors.boneDim,
    }));

    const listing = selectedTile
      ? {
          title: selectedTile.title,
          url: selectedTile.url,
          method: selectedTile.method,
          stock: selectedTile.stock,
          priceLine:
            selectedTile.price +
            (selectedTile.lowest
              ? `, LOWEST OF ${tiles.length}`
              : `, ${Math.round(((selectedTile.value - cheapest.value) / cheapest.value) * 100)}% ABOVE LOWEST`),
          confidenceLine: `${selectedTile.confidence}/4`,
          checked: 'THIS SESSION',
          issue: !!selectedTile.issue,
        }
      : null;

    const selectedCandidate = candidates[chosen];

    // The Learn Something side of the app: what the lowest price actually means,
    // stated in the numbers this search produced rather than a fixed line.
    const confirmDomain = selectedTile?.domain ?? tiles.find((tile) => tile.issue)?.domain ?? 'this source';
    const confirmSuffix = `${candidates.length}_LOW_CONFIDENCE`;
    const confirmInsight =
      candidates.length === 0
        ? 'Nothing to confirm. Every source matched above the threshold.'
        : `${confirmDomain} returned ${candidates.length} listings for this query and the best scored ${Math.round((candidates[0]?.confidence ?? 0) * 100)}%, which does not clear the 60% needed to trust it. The one you pick is the one compared, and it is counted against this source for next time.`;

    const historyTrend =
      history.length > 1 ? (history[history.length - 1] < history[history.length - 2] ? 'FALLING' : 'RISING') : 'FLAT';
    const historySummary =
      history.length === 0
        ? cheapest
          ? `NO HISTORY YET · TODAY ${cheapest.price}`
          : 'NO HISTORY YET'
        : `LOW ${fmtPrice(Math.min(...history))} · MEDIAN ${fmtPrice(medianOf(history))} · TODAY ${fmtPrice(history[history.length - 1])}, ${historyTrend}`;

    const heuristicCount = tiles.filter((tile) => tile.tier === 4).length;
    const resultMetadata = [
      `${blockedSources} ${blockedSources === 1 ? 'SOURCE' : 'SOURCES'} BLOCKED`,
      `${heuristicCount} ${heuristicCount === 1 ? 'PRICE' : 'PRICES'} FROM HEURISTIC PARSING`,
      `${resolved} OF ${sources.length} SOURCES RESOLVED`,
    ];

    return {
      mode: noProject ? ('demo' as const) : ('live' as const),
      error: session.error,
      authPhase: auth.phase,
      isGuest: auth.isGuest,
      sources,
      tiles,
      saved,
      recents,
      candidates,
      notes,
      running,
      complete,
      resolved,
      sorted,
      spread,
      blockedSources,
      failedSources,
      openIssues,
      selectedTile,
      railName: railName[screen],
      railConnection: (running ? 'LIVE' : 'IDLE') as 'LIVE' | 'IDLE',
      statusLine: statusLine[screen],
      nav: nav[screen],
      historyBars,
      ladder,
      listing,
      showListing: selectedTile !== null && !running,
      hasAlerts: notes.length + dismissed.length > 0,
      alertCount: notes.length + dismissed.length,
      archiveCount: dismissed.length,
      archiveEmpty: dismissed.length === 0,
      hasDrops: droppedCount > 0,
      showArchive,
      showAccount,
      showLinks,
      hasLinks: stagedLinks.length > 0,
      linksCount: stagedLinks.length,
      stagedLinks,
      accountEmail: auth.user?.email ?? null,
      sourceCountLabel: String(sources.length).padStart(2, '0'),
      recentCount: String(recents.length).padStart(2, '0'),
      candidateSelectedLabel: selectedCandidate
        ? `${selectedCandidate.price} · ${Math.round(selectedCandidate.confidence * 100)}%`
        : 'NONE',
      historySuffix: `${String(history.length).padStart(2, '0')}_CHECKS`,
      historySummary,
      confirmDomain,
      confirmSuffix,
      confirmInsight,
      resultMetadata,
      spreadPoints: sorted.map((tile) => ({ value: tile.value, priceLabel: tile.price, label: tile.retailer.toUpperCase() })),
      spreadLabel: `SPREAD · ${spread}% · N=${tiles.length} · TIERS ${tiles.map((tile) => `T${tile.tier}`).join(' ')}`,
      resultSuffix: `${tiles.length}_PRICES`,
      archiveLabeled: dismissed.map((note) => ({
        ...note,
        label: (note.kind === 'prompt' ? '>' : note.kind === 'drop' ? '//' : '!') + note.heading,
      })),
    };
  }, [
    state,
    session,
    noProject,
    auth.phase,
    auth.isGuest,
    auth.user?.email,
    runSearch,
    resetSources,
    backToSourcesFromLive,
    confirmMatches,
    openConfirm,
    saveCurrentSearch,
    checkAll,
    setScreen,
  ]);

  return {
    state,
    ...derived,
    actions: {
      setScreen,
      runSearch,
      addSourceFromInput,
      removeSource,
      setInput,
      setQuery,
      chooseRecent,
      selectTile,
      closeListing,
      chooseCandidate,
      openConfirm,
      confirmMatches,
      discardConfirmSource,
      dismissNote,
      toggleArchive,
      toggleAccount,
      toggleLinks,
      openRetry,
      closeRetry,
      openDiscard,
      closeDiscard,
      submitRetryUrl,
      saveCurrentSearch,
      checkItem,
      checkAll,
      openSaved,
    },
  };
}

export type SiftFlow = ReturnType<typeof useSiftFlow>;
