import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CANDIDATES,
  HISTORY,
  INITIAL_NOTES,
  INITIAL_RECENTS,
  INITIAL_SAVED,
  SOURCES,
  STREAM_SPEED_MS,
  TILES,
} from '@/constants/sift-mock-data';
import { fmtPrice } from '@/lib/format-price';
import type { NoteView, SavedItemView, SourceView, TileView } from '@/types/view';
import type { SiftSession } from './types';

interface DemoState {
  sources: SourceView[];
  tiles: TileView[];
  saved: SavedItemView[];
  notes: NoteView[];
  running: boolean;
  complete: boolean;
}

const INITIAL: DemoState = {
  sources: SOURCES.map((source) => ({ ...source })),
  tiles: [],
  saved: INITIAL_SAVED.map((item) => ({ ...item })),
  notes: INITIAL_NOTES.map((note) => ({ ...note })),
  running: false,
  complete: false,
};

/**
 * The seeded dataset, on a timer. This is what runs with no Firebase project
 * configured, so the app is still demoable offline and the screens can be
 * reviewed without waiting on a real scrape.
 */
export function useDemoSession(): SiftSession {
  const [state, setState] = useState<DemoState>(INITIAL);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const runSearch = useCallback(() => {
    clearTimers();

    setState((s) => ({
      ...s,
      running: true,
      complete: false,
      tiles: [],
      sources: s.sources.map((source) => (source.status === 'BLOCKED' ? source : { ...source, status: 'PENDING' })),
    }));

    const targets = INITIAL.sources.filter((source) => source.status !== 'BLOCKED');
    targets.forEach((source, index) =>
      at(STREAM_SPEED_MS * (index + 1), () =>
        setState((s) => {
          const tile = TILES[index];
          return {
            ...s,
            sources: s.sources.map((x) => (x.domain === source.domain ? { ...x, status: 'RESOLVED' } : x)),
            tiles: tile ? [...s.tiles, tile] : s.tiles,
          };
        }),
      ),
    );

    at(STREAM_SPEED_MS * (targets.length + 1), () =>
      setState((s) => ({
        ...s,
        running: false,
        complete: true,
        notes: s.tiles.some((tile) => tile.issue)
          ? [
              ...s.notes,
              {
                id: 'confirm-evetech.co.za',
                kind: 'prompt',
                domain: 'evetech.co.za',
                heading: 'CONFIRM_MATCH',
                body: 'evetech.co.za matched at 42%, which does not clear the 60% needed to trust it. Select that tile to resolve it.',
              },
            ]
          : s.notes,
      })),
    );
  }, [at, clearTimers]);

  const confirmCandidate = useCallback((index: number) => {
    setState((s) => {
      const candidate = CANDIDATES[index];
      if (!candidate) return s;
      return {
        ...s,
        notes: s.notes.filter((note) => note.kind !== 'prompt'),
        tiles: s.tiles.map((tile) =>
          tile.issue
            ? {
                ...tile,
                price: candidate.price,
                value: candidate.value,
                title: candidate.title,
                confidence: 4,
                count: undefined,
                issue: false,
              }
            : tile,
        ),
      };
    });
  }, []);

  const saveCurrentSearch = useCallback((query: string) => {
    setState((s) => {
      if (s.saved.some((item) => item.name === query)) return s;
      const lowest = [...s.tiles].sort((a, b) => a.value - b.value)[0];
      if (!lowest) return s;
      return {
        ...s,
        saved: [
          ...s.saved,
          {
            id: `saved-${Date.now()}`,
            name: query,
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

  const checkSaved = useCallback((savedId: string) => {
    setState((s) => {
      const item = s.saved.find((x) => x.id === savedId);
      if (!item || item.checked) return s;

      const dropped = item.dropTo !== null && item.dropTo < item.value;
      const wasValue = item.value;
      const saved = s.saved.map((x) =>
        x.id === savedId
          ? {
              ...x,
              checked: true,
              justDropped: dropped,
              value: dropped ? (item.dropTo as number) : x.value,
              wasValue: dropped ? wasValue : undefined,
              lastChecked: '00:00 AGO',
            }
          : x,
      );
      if (!dropped) return { ...s, saved };

      const dropTo = item.dropTo as number;
      const percent = Math.round(((wasValue - dropTo) / wasValue) * 1000) / 10;
      return {
        ...s,
        saved,
        notes: [
          ...s.notes,
          {
            id: `drop-${savedId}`,
            kind: 'drop',
            domain: savedId,
            heading: 'PRICE_DROP',
            body: `${item.name} fell to ${fmtPrice(dropTo)} from ${fmtPrice(wasValue)}, ${percent}% down.`,
          },
        ],
      };
    });
  }, []);

  const checkAllSaved = useCallback(() => {
    setState((s) => {
      s.saved.filter((item) => !item.checked).forEach((item) => queueMicrotask(() => checkSaved(item.id)));
      return s;
    });
  }, [checkSaved]);

  const addSource = useCallback((domain: string) => {
    setState((s) =>
      s.sources.some((source) => source.domain === domain)
        ? s
        : { ...s, sources: [...s.sources, { domain, status: 'PENDING' }] },
    );
  }, []);

  const removeSource = useCallback((domain: string) => {
    setState((s) => ({
      ...s,
      sources: s.sources.filter((source) => source.domain !== domain),
      notes: s.notes.filter((note) => note.domain !== domain),
    }));
  }, []);

  const resetSources = useCallback(() => {
    clearTimers();
    setState(INITIAL);
  }, [clearTimers]);

  const cancelSearch = useCallback(() => {
    clearTimers();
    setState((s) => ({ ...s, running: false, complete: false, tiles: [] }));
  }, [clearTimers]);

  return useMemo<SiftSession>(
    () => ({
      mode: 'demo',
      error: null,
      sources: state.sources,
      tiles: state.tiles,
      saved: state.saved,
      recents: INITIAL_RECENTS,
      candidates: CANDIDATES,
      notes: state.notes,
      history: HISTORY,
      running: state.running,
      complete: state.complete,
      addSource,
      removeSource,
      resetSources,
      runSearch,
      cancelSearch,
      beginConfirm: () => {},
      confirmCandidate,
      saveCurrentSearch,
      checkSaved,
      checkAllSaved,
    }),
    [state, addSource, removeSource, resetSources, runSearch, cancelSearch, confirmCandidate, saveCurrentSearch, checkSaved, checkAllSaved],
  );
}
