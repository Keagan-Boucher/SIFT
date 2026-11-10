import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

import { AccountView } from '@/components/sift/views/AccountView';
import { AlertsView } from '@/components/sift/views/AlertsView';
import { CompareView } from '@/components/sift/views/CompareView';
import { ConfirmView } from '@/components/sift/views/ConfirmView';
import { FixView } from '@/components/sift/views/FixView';
import { HomeView } from '@/components/sift/views/HomeView';
import { LiveView } from '@/components/sift/views/LiveView';
import { PresetsView } from '@/components/sift/views/PresetsView';
import { SavedView } from '@/components/sift/views/SavedView';
import { SourcesView } from '@/components/sift/views/SourcesView';
import { useAuth } from '@/hooks/use-auth';
import { useOrientationPolicy } from '@/hooks/use-orientation-policy';
import { useSiftFlow, type Screen, type SiftFlow } from '@/hooks/use-sift-flow';

const VIEWS: Record<Screen, ComponentType<{ flow: SiftFlow }>> = {
  home: HomeView,
  sources: SourcesView,
  presets: PresetsView,
  live: LiveView,
  confirm: ConfirmView,
  fix: FixView,
  compare: CompareView,
  alerts: AlertsView,
  saved: SavedView,
  account: AccountView,
};

/**
 * The app shell. Each view owns its Screen (top bar, body, action bar) and
 * decides its own landscape split; this only picks which one is showing.
 */
export default function SiftAppScreen() {
  useOrientationPolicy();
  const { phase } = useAuth();
  const flow = useSiftFlow();

  // Signing out from the account screen drops straight back to the gate.
  if (phase === 'signedOut') return <Redirect href="/auth" />;

  const { screen, session } = flow;
  // A finished scan with nothing priced is the no-results screen, which lives with compare.
  const nothingCameBack = screen === 'live' && session.complete && session.tiles.length === 0 && session.sources.length > 0;
  const ActiveView = nothingCameBack ? CompareView : VIEWS[screen];
  return <ActiveView flow={flow} />;
}
