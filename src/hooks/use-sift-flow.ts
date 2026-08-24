import { useCallback, useMemo, useState } from 'react';

import { SiftColors } from '@/constants/sift-theme';
import { fmtPrice } from '@/lib/format-price';
import { DEFAULT_QUERY, SESSION_CODE } from '@/constants/sift-mock-data';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useDemoSession } from '@/hooks/session/use-demo-session';
import { useLiveSession } from '@/hooks/session/use-live-session';
import type { NoteView } from '@/types/view';

export type Screen = 'sources' | 'live' | 'confirm' | 'results' | 'dashboard' | 'saved';

interface ArchiveEntry extends NoteView {
  stamp: string;
}

/**
 * UI-only state. Everything about sources, listings, saved searches and notes
 * comes from the session, so this holds nothing the backend also owns.
 */
interface FlowState {
  screen: Screen;
  input: string;
  query: string;
  showArchive: boolean;
  showAccount: boolean;
  chosen: number;
  selected: number | null;
  dismissed: ArchiveEntry[];
}

const INITIAL_STATE: FlowState = {
  screen: 'sources',
  input: '',
  query: DEFAULT_QUERY,
  showArchive: false,
  showAccount: false,
  chosen: 0,
  selected: null,
  dismissed: [],
};

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
  const [state, setState] = useState<FlowState>(INITIAL_STATE);

  const auth = useAuth();
  const live = useLiveSession(auth.user?.uid ?? null);
  const demo = useDemoSession();

  // Live only once there is a project and a signed-in uid to own the documents.
  const session = isFirebaseConfigured && auth.phase === 'ready' ? live : demo;

  const setScreen = useCallback((screen: Screen) => setState((s) => ({ ...s, screen })), []);
  const setQuery = useCallback((query: string) => setState((s) => ({ ...s, query })), []);
  const setInput = useCallback((input: string) => setState((s) => ({ ...s, input })), []);
  const chooseRecent = useCallback((name: string) => setState((s) => ({ ...s, query: name })), []);
  const toggleArchive = useCallback(() => setState((s) => ({ ...s, showArchive: !s.showArchive, showAccount: false })), []);
  const toggleAccount = useCallback(() => setState((s) => ({ ...s, showAccount: !s.showAccount, showArchive: false })), []);
  const selectTile = useCallback((index: number) => setState((s) => ({ ...s, selected: index })), []);
  const closeListing = useCallback(() => setState((s) => ({ ...s, selected: null })), []);
  const chooseCandidate = useCallback((index: number) => setState((s) => ({ ...s, chosen: index })), []);
  const openSaved = useCallback(() => setScreen('saved'), [setScreen]);

  const addSourceFromInput = useCallback(() => {
    setState((s) => {
      const domain = toDomain(s.input);
      if (domain) session.addSource(domain);
      return { ...s, input: '' };
    });
  }, [session]);

  const removeSource = useCallback(
    (domain: string) => {
      session.removeSource(domain);
    },
    [session],
  );

  const resetSources = useCallback(() => {
    session.resetSources();
    setState((s) => ({ ...s, input: '', dismissed: [] }));
  }, [session]);

  const runSearch = useCallback(() => {
    session.runSearch(state.query);
    setState((s) => ({ ...s, screen: 'live', selected: null, chosen: 0 }));
  }, [session, state.query]);

  const backToSourcesFromLive = useCallback(() => {
    session.cancelSearch();
    setState((s) => ({ ...s, screen: 'sources', selected: null }));
  }, [session]);

  /** Notes the user has dismissed move to the archive rather than disappearing. */
  const dismissNote = useCallback(
    (id: string) => {
      const note = session.notes.find((n) => n.id === id);
      if (!note) return;
      setState((s) => ({ ...s, dismissed: [{ ...note, stamp: `SESSION ${SESSION_CODE}` }, ...s.dismissed] }));
    },
    [session.notes],
  );

  const openConfirm = useCallback(
    (domain: string) => {
      session.beginConfirm(domain);
      setState((s) => ({ ...s, screen: 'confirm', chosen: 0, selected: null }));
    },
    [session],
  );

  const confirmMatches = useCallback(() => {
    session.confirmCandidate(state.chosen);
    setState((s) => ({ ...s, screen: 'live', selected: null }));
  }, [session, state.chosen]);

  const saveCurrentSearch = useCallback(() => {
    session.saveCurrentSearch(state.query);
  }, [session, state.query]);

  const checkItem = useCallback((id: string) => session.checkSaved(id), [session]);
  const checkAll = useCallback(() => session.checkAllSaved(), [session]);

  const derived = useMemo(() => {
    const { screen, selected, chosen, dismissed, showArchive, showAccount } = state;
    const { tiles, sources, saved, recents, candidates, running, complete, history } = session;

    const dismissedIds = new Set(dismissed.map((note) => note.id));
    const notes = session.notes.filter((note) => !dismissedIds.has(note.id));

    const resolved = tiles.length;
    const sorted = [...tiles].sort((a, b) => a.value - b.value);
    const cheapest = sorted[0];
    const dearest = sorted[sorted.length - 1];
    const spread =
      sorted.length > 1 ? Math.round(((dearest.value - cheapest.value) / cheapest.value) * 1000) / 10 : 0;

    const blockedSources = sources.filter((source) => source.status === 'BLOCKED').length;
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
          : `${sources.length} SOURCES · ${session.mode === 'demo' ? 'DEMO' : 'IDLE'}`,
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
        primaryLabel: !complete ? 'SEARCH RUNNING' : selectedIssue ? 'RESOLVE ISSUE' : 'CONFIRM MATCHES',
        primaryAction: () => {
          if (selectedIssue && selectedTile) openConfirm(selectedTile.domain);
          else setScreen('results');
        },
        primaryDisabled: !complete || (!selectedIssue && openIssues > 0),
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
          checked: `SESSION ${SESSION_CODE}`,
          issue: !!selectedTile.issue,
        }
      : null;

    const selectedCandidate = candidates[chosen];

    // The Learn Something side of the app: what the lowest price actually means,
    // stated in the numbers this search produced rather than a fixed line.
    const historyLow = history.length > 0 ? Math.min(...history) : null;
    const aboveRecordLow =
      cheapest && historyLow !== null && historyLow > 0
        ? Math.round(((cheapest.value - historyLow) / historyLow) * 1000) / 10
        : null;

    const resultInsight = !cheapest
      ? 'No prices came back yet. Add a source or widen the query.'
      : [
          `${cheapest.price} is the lowest of your ${tiles.length} ${tiles.length === 1 ? 'source' : 'sources'}`,
          sorted.length > 1 ? `, ${spread}% below the dearest` : '',
          aboveRecordLow === null
            ? '. Watch it to start recording what it usually costs.'
            : aboveRecordLow <= 0
              ? `. That is the lowest figure recorded across ${history.length} checks.`
              : `, and ${aboveRecordLow}% above the lowest of the ${history.length} checks recorded so far.`,
        ].join('');

    const confirmDomain = selectedTile?.domain ?? tiles.find((tile) => tile.issue)?.domain ?? 'this source';
    const confirmSuffix = `${candidates.length}_LOW_CONFIDENCE`;
    const confirmInsight =
      candidates.length === 0
        ? 'Nothing to confirm. Every source matched above the threshold.'
        : `${confirmDomain} returned ${candidates.length} listings for this query and the best scored ${Math.round((candidates[0]?.confidence ?? 0) * 100)}%, under the 60% threshold. The one you pick is the one compared, and it is counted against this source for next time.`;

    const median =
      sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) / 2)].value : null;
    const belowMedian =
      cheapest && median && median > 0 ? Math.round(((median - cheapest.value) / median) * 100) : 0;

    const liveInsight = !cheapest
      ? 'Waiting on the first price.'
      : sorted.length > 1
        ? `${cheapest.price} is the lowest of ${tiles.length} sources, ${belowMedian}% below their median of ${fmtPrice(median as number)}.`
        : `${cheapest.price} from ${cheapest.retailer}. Add another source to see how that compares.`;

    const historyTrend =
      history.length > 1 ? (history[history.length - 1] < history[history.length - 2] ? 'FALLING' : 'RISING') : 'FLAT';
    const historySummary =
      history.length === 0
        ? cheapest
          ? `NO HISTORY YET · TODAY ${cheapest.price}`
          : 'NO HISTORY YET'
        : `LOW ${fmtPrice(Math.min(...history))} · MEDIAN ${fmtPrice([...history].sort((a, b) => a - b)[Math.floor((history.length - 1) / 2)])} · TODAY ${fmtPrice(history[history.length - 1])}, ${historyTrend}`;

    const heuristicCount = tiles.filter((tile) => tile.tier === 4).length;
    const resultMetadata = [
      `${blockedSources} ${blockedSources === 1 ? 'SOURCE' : 'SOURCES'} BLOCKED`,
      `${heuristicCount} ${heuristicCount === 1 ? 'PRICE' : 'PRICES'} FROM HEURISTIC PARSING`,
      `${resolved} OF ${sources.length} SOURCES RESOLVED`,
    ];

    return {
      mode: session.mode,
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
      accountEmail: auth.user?.email ?? null,
      sourceCountLabel: String(sources.length).padStart(2, '0'),
      recentCount: String(recents.length).padStart(2, '0'),
      candidateSelectedLabel: selectedCandidate
        ? `${selectedCandidate.price} · ${Math.round(selectedCandidate.confidence * 100)}%`
        : 'NONE',
      liveInsight,
      historySuffix: `${String(history.length).padStart(2, '0')}_CHECKS`,
      historySummary,
      confirmSuffix,
      confirmInsight,
      resultInsight,
      resultMetadata,
      spreadPoints: sorted.map((tile) => ({ value: tile.value, priceLabel: tile.price, label: tile.retailer.toUpperCase() })),
      spreadLabel: `SPREAD ${SESSION_CODE} · ${spread}% · N=${tiles.length} · TIERS ${tiles.map((tile) => `T${tile.tier}`).join(' ')}`,
      resultSuffix: `${SESSION_CODE}_${tiles.length}_PRICES`,
      archiveLabeled: dismissed.map((note) => ({
        ...note,
        label: (note.kind === 'prompt' ? '>' : note.kind === 'drop' ? '//' : '!') + note.heading,
      })),
    };
  }, [
    state,
    session,
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
      dismissNote,
      toggleArchive,
      toggleAccount,
      saveCurrentSearch,
      checkItem,
      checkAll,
      openSaved,
    },
  };
}

export type SiftFlow = ReturnType<typeof useSiftFlow>;
