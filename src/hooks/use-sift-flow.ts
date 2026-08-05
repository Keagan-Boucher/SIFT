import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SiftColors } from '@/constants/sift-theme';
import {
  CANDIDATES,
  DEFAULT_QUERY,
  HISTORY,
  INITIAL_NOTES,
  INITIAL_RECENTS,
  INITIAL_SAVED,
  SESSION_CODE,
  SOURCES,
  STREAM_SPEED_MS,
  TILES,
  type MockNote,
  type MockRecent,
  type MockSavedItem,
  type MockSource,
  type MockTile,
} from '@/constants/sift-mock-data';
import { fmtPrice } from '@/lib/format-price';

export type Screen = 'sources' | 'live' | 'confirm' | 'results' | 'dashboard' | 'saved';

interface ArchiveEntry extends MockNote {
  stamp: string;
}

interface FlowState {
  screen: Screen;
  input: string;
  query: string;
  running: boolean;
  complete: boolean;
  tiles: MockTile[];
  sources: MockSource[];
  notes: MockNote[];
  archive: ArchiveEntry[];
  showArchive: boolean;
  saved: MockSavedItem[];
  chosen: number;
  confirmed: boolean;
  selected: number | null;
  recents: MockRecent[];
}

const INITIAL_STATE: FlowState = {
  screen: 'sources',
  input: '',
  query: DEFAULT_QUERY,
  running: false,
  complete: false,
  tiles: [],
  sources: SOURCES.map((s) => ({ ...s })),
  notes: INITIAL_NOTES.map((n) => ({ ...n })),
  archive: [],
  showArchive: false,
  saved: INITIAL_SAVED.map((s) => ({ ...s })),
  chosen: 1,
  confirmed: false,
  selected: null,
  recents: INITIAL_RECENTS.map((r) => ({ ...r })),
};

export function useSiftFlow() {
  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const setSourceStatus = useCallback((domain: string, status: MockSource['status']) => {
    setState((s) => ({ ...s, sources: s.sources.map((x) => (x.domain === domain ? { ...x, status } : x)) }));
  }, []);

  const addTile = useCallback((index: number) => {
    const tile = TILES[index];
    if (!tile) return;
    setState((s) => ({ ...s, tiles: [...s.tiles, tile] }));
  }, []);

  const setScreen = useCallback((screen: Screen) => setState((s) => ({ ...s, screen })), []);

  const runSearch = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const t = STREAM_SPEED_MS;

    setState((s) => ({
      ...s,
      recents: [{ name: s.query, meta: 'RUNNING NOW' }, ...s.recents.filter((r) => r.name !== s.query)].slice(0, 4),
      screen: 'live',
      running: true,
      complete: false,
      tiles: [],
      confirmed: false,
      sources: s.sources.map((x) => ({ ...x, status: x.status === 'BLOCKED' ? x.status : 'PENDING' })),
    }));

    const targets = state.sources.filter((x) => x.status !== 'BLOCKED');
    targets.forEach((src, i) =>
      at(t * (i + 1), () => {
        setSourceStatus(src.domain, 'RESOLVED');
        addTile(i);
      }),
    );
    at(t * (targets.length + 1), () =>
      setState((s) => ({
        ...s,
        running: false,
        complete: true,
        notes: s.tiles.some((x) => x.issue)
          ? [
              ...s.notes,
              {
                id: 'review-' + Date.now(),
                kind: 'prompt',
                heading: 'CONFIRM_MATCH',
                body: 'evetech.co.za matched below 60%. Select that tile to resolve it.',
              },
            ]
          : s.notes,
      })),
    );
  }, [at, addTile, setSourceStatus, state.sources]);

  const resetSources = useCallback(() => {
    setState((s) => ({ ...s, sources: SOURCES.map((x) => ({ ...x })), input: '' }));
  }, []);

  const backToSourcesFromLive = useCallback(() => {
    setState((s) => ({ ...s, screen: 'sources', running: false, complete: false, tiles: [], selected: null }));
  }, []);

  const addSourceFromInput = useCallback(() => {
    setState((s) => {
      const v = s.input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!v) return s;
      return { ...s, sources: [...s.sources, { domain: v, status: 'PENDING' }], input: '' };
    });
  }, []);

  const removeSource = useCallback((domain: string) => {
    setState((s) => ({
      ...s,
      sources: s.sources.filter((y) => y.domain !== domain),
      notes: s.notes.filter((n) => n.domain !== domain),
      archive: [
        ...s.notes.filter((n) => n.domain === domain).map((n) => ({ ...n, stamp: 'SOURCE REMOVED' })),
        ...s.archive,
      ],
    }));
  }, []);

  const dismissNote = useCallback((id: string) => {
    setState((s) => {
      const note = s.notes.find((n) => n.id === id);
      if (!note) return s;
      return {
        ...s,
        notes: s.notes.filter((n) => n.id !== id),
        archive: [{ ...note, stamp: 'SESSION ' + SESSION_CODE }, ...s.archive],
      };
    });
  }, []);

  const toggleArchive = useCallback(() => setState((s) => ({ ...s, showArchive: !s.showArchive })), []);
  const selectTile = useCallback((i: number) => setState((s) => ({ ...s, selected: i })), []);
  const closeListing = useCallback(() => setState((s) => ({ ...s, selected: null })), []);
  const chooseCandidate = useCallback((i: number) => setState((s) => ({ ...s, chosen: i })), []);
  const chooseRecent = useCallback((name: string) => setState((s) => ({ ...s, query: name })), []);
  const setQuery = useCallback((query: string) => setState((s) => ({ ...s, query })), []);
  const setInput = useCallback((input: string) => setState((s) => ({ ...s, input })), []);
  const openSaved = useCallback(() => setScreen('saved'), [setScreen]);

  const confirmMatches = useCallback(() => {
    setState((s) => {
      const c = CANDIDATES[s.chosen];
      return {
        ...s,
        confirmed: true,
        screen: 'live',
        selected: null,
        notes: s.notes.filter((n) => n.kind !== 'prompt'),
        archive: [
          ...s.notes.filter((n) => n.kind === 'prompt').map((n) => ({ ...n, stamp: 'RESOLVED' })),
          ...s.archive,
        ],
        tiles: s.tiles.map((x) =>
          x.retailer === 'Evetech' ? { ...x, price: c.price, value: c.value, confidence: 4, count: undefined, issue: false } : x,
        ),
      };
    });
  }, []);

  const saveCurrentSearch = useCallback(() => {
    setState((s) => {
      if (s.saved.some((x) => x.name === s.query)) return s;
      const lowest = [...s.tiles].sort((a, b) => a.value - b.value)[0];
      if (!lowest) return s;
      return {
        ...s,
        saved: [
          ...s.saved,
          {
            id: 'saved-' + Date.now(),
            name: s.query,
            value: lowest.value,
            sources: s.tiles.length,
            dropTo: Math.round(lowest.value * 0.96),
            checked: false,
            justDropped: false,
            lastChecked: null,
          },
        ],
      };
    });
  }, []);

  const checkItem = useCallback((id: string) => {
    setState((s) => {
      const item = s.saved.find((x) => x.id === id);
      if (!item || item.checked) return s;
      const drop = !!item.dropTo && item.dropTo < item.value;
      const oldValue = item.value;
      const nextSaved = s.saved.map((x) =>
        x.id === id
          ? {
              ...x,
              checked: true,
              justDropped: drop,
              value: drop ? item.dropTo! : x.value,
              wasValue: drop ? oldValue : undefined,
              lastChecked: '00:00 AGO',
            }
          : x,
      );
      if (!drop) return { ...s, saved: nextSaved };
      const pct = Math.round(((oldValue - item.dropTo!) / oldValue) * 1000) / 10;
      return {
        ...s,
        saved: nextSaved,
        notes: [
          ...s.notes,
          {
            id: 'drop-' + id,
            kind: 'drop',
            domain: id,
            heading: 'PRICE_DROP',
            body: `${item.name} fell to ${fmtPrice(item.dropTo!)} from ${fmtPrice(oldValue)}, ${pct}% down.`,
          },
        ],
      };
    });
  }, []);

  const checkAll = useCallback(() => {
    state.saved.filter((x) => !x.checked).forEach((x) => checkItem(x.id));
  }, [state.saved, checkItem]);

  const derived = useMemo(() => {
    const { screen, tiles, sources, running, complete, selected, saved, notes, archive, chosen, recents } = state;

    const resolved = tiles.length;
    const sorted = [...tiles].sort((a, b) => a.value - b.value);
    const spread =
      sorted.length > 1 ? Math.round(((sorted[sorted.length - 1].value - sorted[0].value) / sorted[0].value) * 1000) / 10 : 0;
    const blockedSources = sources.filter((x) => x.status === 'BLOCKED').length;
    const openIssues = tiles.filter((x) => x.issue).length;
    const sel = selected !== null ? (tiles[selected] ?? null) : null;
    const selectedIssue = !!(sel && sel.issue);
    const droppedCount = saved.filter((x) => x.justDropped).length;

    const railName: Record<Screen, string> = {
      sources: 'ADD SOURCES',
      live: 'LIVE RESULTS',
      confirm: 'CONFIRM MATCHES',
      results: 'LIVE RESULTS',
      dashboard: 'DASHBOARD',
      saved: 'SAVED SEARCHES',
    };

    const statusLine: Record<Screen, string> = {
      sources: blockedSources > 0 ? `${blockedSources} BLOCKED · REMOVE TO CONTINUE` : `${sources.length} SOURCES · IDLE`,
      live: running
        ? `${resolved}/${sources.length} RESOLVED · LIVE`
        : openIssues > 0
          ? `${openIssues} TO REVIEW · SELECT TO RESOLVE`
          : `${resolved} PRICES · COMPLETE`,
      confirm: '2 CANDIDATES · IDLE',
      results: `${resolved} PRICES · COMPLETE`,
      dashboard: `${resolved} PRICES · SPREAD ${spread}%`,
      saved: droppedCount > 0 ? `${droppedCount} DROPPED · REVIEW` : `${saved.length} WATCHED · IDLE`,
    };

    const nav: Record<Screen, { primaryLabel: string; primaryAction: () => void; primaryDisabled?: boolean; secondaryLabel: string; secondaryAction: () => void }> = {
      sources: { primaryLabel: 'RUN SEARCH', primaryAction: runSearch, primaryDisabled: blockedSources > 0, secondaryLabel: 'RESET', secondaryAction: resetSources },
      live: {
        primaryLabel: !complete ? 'SEARCH RUNNING' : selectedIssue ? 'RESOLVE ISSUE' : 'CONFIRM MATCHES',
        primaryAction: () => setScreen(selectedIssue ? 'confirm' : 'results'),
        primaryDisabled: !complete || (!selectedIssue && openIssues > 0),
        secondaryLabel: 'BACK',
        secondaryAction: backToSourcesFromLive,
      },
      confirm: { primaryLabel: 'CONFIRM MATCH', primaryAction: confirmMatches, secondaryLabel: 'BACK', secondaryAction: () => setScreen('live') },
      results: { primaryLabel: 'VIEW SPREAD', primaryAction: () => setScreen('dashboard'), secondaryLabel: 'BACK', secondaryAction: () => setScreen('confirm') },
      dashboard: {
        primaryLabel: 'SAVE SEARCH',
        primaryAction: () => {
          saveCurrentSearch();
          setScreen('saved');
        },
        secondaryLabel: 'BACK',
        secondaryAction: () => setScreen('results'),
      },
      saved: { primaryLabel: 'CHECK ALL', primaryAction: checkAll, primaryDisabled: saved.every((x) => x.checked), secondaryLabel: 'BACK', secondaryAction: () => setScreen('sources') },
    };

    const hmin = Math.min(...HISTORY);
    const hmax = Math.max(...HISTORY);
    const historyBars = HISTORY.map((v, i) => ({
      heightPx: 14 + ((v - hmin) / (hmax - hmin)) * 46,
      isToday: i === HISTORY.length - 1,
    }));

    const ladder = sorted.map((t) => ({
      label: t.retailer.toUpperCase(),
      price: t.price,
      widthPct: 10 + ((t.value - sorted[0].value) / ((sorted[sorted.length - 1].value - sorted[0].value) || 1)) * 90,
      color: t.value === sorted[0].value ? SiftColors.mint : t.value === sorted[sorted.length - 1].value ? SiftColors.ember : SiftColors.boneDim,
    }));

    const listing = sel
      ? {
          title: sel.title,
          url: sel.url,
          method: sel.method,
          stock: sel.stock,
          priceLine:
            sel.price + (sel.lowest ? `, LOWEST OF ${tiles.length}` : `, ${Math.round(((sel.value - sorted[0].value) / sorted[0].value) * 100)}% ABOVE LOWEST`),
          confidenceLine: `${sel.confidence}/4`,
          checked: `00:04 AGO · SESSION ${SESSION_CODE}`,
          issue: !!sel.issue,
        }
      : null;

    return {
      resolved,
      sorted,
      spread,
      blockedSources,
      openIssues,
      selectedTile: sel,
      railName: railName[screen],
      railConnection: (running ? 'LIVE' : 'IDLE') as 'LIVE' | 'IDLE',
      statusLine: statusLine[screen],
      nav: nav[screen],
      historyBars,
      ladder,
      listing,
      showListing: sel !== null && !running,
      hasAlerts: notes.length + archive.length > 0,
      alertCount: notes.length + archive.length,
      archiveCount: archive.length,
      archiveEmpty: archive.length === 0,
      hasDrops: droppedCount > 0,
      sourceCountLabel: String(sources.length).padStart(2, '0'),
      recentCount: String(recents.length).padStart(2, '0'),
      candidateSelectedLabel: `${CANDIDATES[chosen].price} · ${Math.round(CANDIDATES[chosen].confidence * 100)}%`,
      spreadPoints: sorted.map((t) => ({ value: t.value, priceLabel: t.price, label: t.retailer.toUpperCase() })),
      spreadLabel: `SPREAD ${SESSION_CODE} · ${spread}% · N=${tiles.length} · TIERS ${tiles.map((t) => 'T' + t.tier).join(' ')}`,
      resultSuffix: `${SESSION_CODE}_${tiles.length}_PRICES`,
      archiveLabeled: archive.map((n) => ({ ...n, label: (n.kind === 'prompt' ? '>' : n.kind === 'drop' ? '//' : '!') + n.heading })),
    };
  }, [state, runSearch, resetSources, backToSourcesFromLive, confirmMatches, saveCurrentSearch, checkAll, setScreen]);

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
      confirmMatches,
      dismissNote,
      toggleArchive,
      saveCurrentSearch,
      checkItem,
      checkAll,
      openSaved,
    },
  };
}

export type SiftFlow = ReturnType<typeof useSiftFlow>;
