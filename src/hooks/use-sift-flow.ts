import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TopIcon } from '@/components/ui/Screen';
import { SiftColors } from '@/constants/sift-theme';
import { useAuth } from '@/hooks/use-auth';
import { useLiveSession } from '@/hooks/session/use-live-session';
import { hasBackend } from '@/lib/firebase';
import { PRESET_CATEGORIES } from '@/lib/presets';
import { recommend } from '@/lib/recommend';
import { useKnownDomains } from '@/lib/registry';
import { useFlowStore, type Screen } from '@/store/useFlowStore';
import type { AlertView, SearchSummary, SourceView, Step } from '@/types/view';

export type { Screen };

/** A search typed but never started. Nothing for the backend to do with it, so it stays on the device. */
const DRAFT_KEY = 'sift.draft';

interface Draft {
  query: string;
  sources: string[];
}

const STEP_FOR_SCREEN: Partial<Record<Screen, Step>> = { live: 'scan', fix: 'scan', confirm: 'confirm', compare: 'compare' };
const SCREEN_FOR_STEP: Record<Step, Screen> = { sources: 'sources', scan: 'live', confirm: 'live', compare: 'compare' };

/** Trims a pasted URL down to the bare domain the backend expects. */
export function toDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '');
}

export function useSiftFlow() {
  const store = useFlowStore();
  const { screen, query, patch, read } = store;
  const auth = useAuth();
  const session = useLiveSession(auth.user?.uid ?? null);
  const { setStep, setSources, searchId } = session;
  /** The draft from a previous launch. While the app runs, the live query and staged sources are the draft. */
  const [storedDraft, setStoredDraft] = useState<Draft | null>(null);

  const go = useCallback((next: Screen) => patch({ screen: next }), [patch]);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => raw && setStoredDraft(JSON.parse(raw) as Draft))
      .catch(() => {});
  }, []);

  const staged = session.sources.map((source) => source.domain).join(',');
  const liveDraft: Draft | null =
    !searchId && (query.trim() || staged) ? { query: query.trim(), sources: staged ? staged.split(',') : [] } : null;
  const draft = liveDraft ?? storedDraft;

  // Persisted while the new search screen is open, so it survives the app being closed.
  useEffect(() => {
    if (screen !== 'sources' || searchId) return;
    if (liveDraft) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(liveDraft)).catch(() => {});
    else AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    // liveDraft is rebuilt every render; query and staged are what it is made of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, query, staged, searchId]);

  // The step is written on every transition, never on a timer: it is the resume pointer.
  const step = STEP_FOR_SCREEN[screen];
  useEffect(() => {
    if (step) setStep(step);
  }, [step, setStep]);

  const past = useMemo(
    () => session.searches.map((search) => ({ query: search.query, sources: search.sources, at: search.at })),
    [session.searches],
  );
  const candidateDomains = useMemo(() => recommend(query, past, {}).map((s) => s.domain), [query, past]);
  const known = useKnownDomains(candidateDomains);
  const suggestions = useMemo(() => recommend(query, past, known), [query, past, known]);

  // The top three arrive selected, and keep tracking the query until the user picks for themselves.
  const topThree = suggestions
    .slice(0, 3)
    .map((s) => s.domain)
    .join(',');
  useEffect(() => {
    if (screen === 'sources' && !store.sourcesTouched && !searchId) setSources(topThree ? topThree.split(',') : []);
  }, [screen, topThree, store.sourcesTouched, searchId, setSources]);

  const unread = session.alerts.filter((alert) => !read.includes(alert.id));

  // Everything in this run that is waiting on the user, weak matches included.
  const needs: SourceView[] = [
    ...session.sources.filter((source) => source.kind),
    ...session.tiles
      .filter((tile) => tile.issue)
      .map((tile) => ({ domain: tile.domain, status: 'RESOLVED' as const, kind: 'weak-match' as const })),
  ];

  const inProgress = session.searches.find((search) => !search.finished) ?? null;
  const finished = session.searches.filter((search) => search.finished);

  const actions = useMemo(() => {
    const openConfirm = (domain: string) => {
      session.beginConfirm(domain);
      patch({ chosen: null, screen: 'confirm' });
    };
    const retry = () => {
      session.runSearch(query.trim());
      patch({ screen: 'live' });
    };
    return {
      go,
      setQuery: (next: string) => patch({ query: next }),
      newSearch: () => {
        session.resetSources();
        setStoredDraft(null);
        patch({ screen: 'sources', query: '', sourcesTouched: false, allSuggestions: false, ownUrl: null });
      },
      resumeDraft: () => {
        if (!draft) return;
        session.resetSources();
        setSources(draft.sources);
        patch({ screen: 'sources', query: draft.query, sourcesTouched: draft.sources.length > 0 });
      },
      /** Back into an earlier search, at the screen its step names. Listeners rehydrate the rest. */
      openSearch: (search: SearchSummary) => {
        if (search.id !== searchId) session.resumeSearch(search);
        patch({ query: search.query, screen: SCREEN_FOR_STEP[search.step] });
      },
      toggleSource: (domain: string) => {
        if (session.sources.some((source) => source.domain === domain)) session.removeSource(domain);
        else session.addSource(domain);
        patch({ sourcesTouched: true });
      },
      setOwnUrl: (next: string | null) => patch({ ownUrl: next }),
      addOwnUrl: () => {
        const domain = toDomain(store.ownUrl ?? '');
        if (domain) session.addSource(domain);
        patch({ ownUrl: null, sourcesTouched: true });
      },
      showAllSuggestions: () => patch({ allSuggestions: true }),
      startScan: () => {
        session.runSearch(query.trim());
        setStoredDraft(null);
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        patch({ screen: 'live' });
      },
      editSearch: () => patch({ screen: 'sources', sourcesTouched: true }),
      retry,
      /** Every failure carries its own fix: paste a URL, pick a match, or run it again. */
      fix: (source: SourceView) => {
        if (source.kind === 'no-results') patch({ fixDomain: source.domain, fixUrl: '', screen: 'fix' });
        else if (source.kind === 'weak-match') openConfirm(source.domain);
        else retry();
      },
      openConfirm,
      choose: (index: number) => patch({ chosen: index }),
      confirm: (index: number) => {
        session.confirmCandidate(index);
        patch({ screen: 'live' });
      },
      skipSite: () => {
        session.discardConfirmSource();
        patch({ screen: 'live' });
      },
      setFixUrl: (next: string) => patch({ fixUrl: next }),
      useUrl: () => {
        const url = store.fixUrl.trim();
        // A pasted URL often arrives without its scheme; the pipeline needs one to fetch it.
        if (store.fixDomain && url) session.retryWithUrl(query.trim(), store.fixDomain, /^https?:\/\//i.test(url) ? url : `https://${url}`);
        patch({ screen: 'live', fixDomain: null });
      },
      drop: (domain: string) => {
        session.dropSource(domain);
        patch({ screen: 'live', fixDomain: null });
      },
      save: () => {
        session.saveCurrentSearch(query.trim());
        patch({ screen: 'saved' });
      },
      checkSaved: session.checkSaved,
      checkAllSaved: session.checkAllSaved,
      openCategory: store.openCategory,
      addPreset: () => {
        PRESET_CATEGORIES.find((category) => category.id === store.presetCategory)?.domains.forEach(session.addSource);
        patch({ screen: 'sources', sourcesTouched: true });
      },
      openAlert: (alert: AlertView) => {
        patch({ read: [...read, alert.id] });
        if (alert.kind === 'drop') return go('saved');
        if (alert.kind === 'no-results' && alert.domain) return patch({ fixDomain: alert.domain, fixUrl: '', screen: 'fix' });
        if (alert.kind === 'weak-match' && alert.domain) return openConfirm(alert.domain);
        retry();
      },
    };
  }, [go, patch, session, setSources, query, read, draft, searchId, store.ownUrl, store.fixDomain, store.fixUrl, store.presetCategory, store.openCategory]);

  const alertDot = unread.some((alert) => alert.kind !== 'drop')
    ? SiftColors.ember
    : unread.length > 0
      ? SiftColors.mint
      : undefined;

  const topIcons: TopIcon[] = [
    { name: 'bell', label: 'Alerts', onPress: () => go('alerts'), dot: alertDot },
    { name: 'bookmark', label: 'Watchlist', onPress: () => go('saved') },
    { name: 'sliders', label: 'Account and settings', onPress: () => go('account') },
  ];

  return {
    ...store,
    noBackend: !hasBackend,
    isGuest: auth.isGuest,
    accountEmail: auth.user?.email ?? null,
    session,
    suggestions,
    known,
    needs,
    unread,
    draft,
    inProgress,
    finished,
    topIcons,
    actions,
  };
}

export type SiftFlow = ReturnType<typeof useSiftFlow>;
