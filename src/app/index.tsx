import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/sift/ActionBar';
import { AccountPopup } from '@/components/sift/AccountPopup';
import { AlertLogPopup } from '@/components/sift/AlertLogPopup';
import { ListingDetailPopup } from '@/components/sift/ListingDetailPopup';
import { NoteBanner } from '@/components/sift/NoteBanner';
import { Rail } from '@/components/sift/Rail';
import { RetryUrlPopup } from '@/components/sift/RetryUrlPopup';
import { SavedPill, SavedStrip } from '@/components/sift/SavedStrip';
import { ConfirmView } from '@/components/sift/views/ConfirmView';
import { DashboardView } from '@/components/sift/views/DashboardView';
import { LiveView } from '@/components/sift/views/LiveView';
import { ResultsView } from '@/components/sift/views/ResultsView';
import { SavedView } from '@/components/sift/views/SavedView';
import { SourcesView } from '@/components/sift/views/SourcesView';
import { SESSION_CODE } from '@/constants/sift-mock-data';
import { SiftColors, SiftSpacing } from '@/constants/sift-theme';
import { useOrientationPolicy } from '@/hooks/use-orientation-policy';
import { useOrientation } from '@/hooks/use-orientation';
import { useSiftFlow } from '@/hooks/use-sift-flow';

const VIEW_BY_SCREEN = {
  sources: SourcesView,
  live: LiveView,
  confirm: ConfirmView,
  results: ResultsView,
  dashboard: DashboardView,
  saved: SavedView,
};

export default function SiftAppScreen() {
  useOrientationPolicy();
  const orientation = useOrientation();
  const flow = useSiftFlow();
  const { state, railName, railConnection, statusLine, nav, hasAlerts, alertCount, archiveCount, archiveLabeled, listing, showListing, hasDrops, notes: activeNotes, sources, showArchive, showAccount, mode, isGuest, accountEmail, actions } = flow;

  const ActiveView = VIEW_BY_SCREEN[state.screen];

  const notes = activeNotes.map((n) => (
    <NoteBanner
      key={n.id}
      kind={n.kind}
      heading={n.heading}
      body={n.body}
      retryable={n.retryable}
      onRetry={n.domain ? () => actions.openRetry(n.domain as string) : undefined}
      onDismiss={() => actions.dismissNote(n.id)}
    />
  ));

  const popups = (
    <>
      {showListing && listing && (
        <View style={[styles.popupAnchor, orientation === 'landscape' ? styles.popupAnchorLandscape : styles.popupAnchorPortrait]}>
          <ListingDetailPopup listing={listing} onClose={actions.closeListing} />
        </View>
      )}
      {showAccount && (
        <View style={[styles.popupAnchor, styles.popupAnchorAbove, orientation === 'landscape' ? styles.popupAnchorLandscape : styles.popupAnchorPortrait]}>
          <AccountPopup
            mode={mode}
            isGuest={isGuest}
            email={accountEmail}
            sessionCode={SESSION_CODE}
            onClose={actions.toggleAccount}
          />
        </View>
      )}
      {showArchive && (
        <View style={[styles.popupAnchor, styles.popupAnchorAbove, orientation === 'landscape' ? styles.popupAnchorLandscape : styles.popupAnchorPortrait]}>
          <AlertLogPopup entries={archiveLabeled} count={String(archiveCount).padStart(2, '0')} onClose={actions.toggleArchive} />
        </View>
      )}
      {state.retryDomain && (
        <View style={[styles.popupAnchor, styles.popupAnchorAbove, orientation === 'landscape' ? styles.popupAnchorLandscape : styles.popupAnchorPortrait]}>
          <RetryUrlPopup
            domain={state.retryDomain}
            onSubmit={(url) => actions.submitRetryUrl(state.retryDomain as string, url)}
            onClose={actions.closeRetry}
          />
        </View>
      )}
    </>
  );

  const actionBar = (
    <ActionBar
      secondaryLabel={nav.secondaryLabel}
      onSecondary={nav.secondaryAction}
      primaryLabel={nav.primaryLabel}
      onPrimary={nav.primaryAction}
      primaryDisabled={nav.primaryDisabled}
      alertCount={alertCount}
      hasAlerts={hasAlerts}
      onToggleAlerts={actions.toggleArchive}
      statusLine={statusLine}
    />
  );

  const scrollableContent = (
    <ScrollView
      style={styles.activeScroll}
      contentContainerStyle={styles.activeScrollContent}
      showsVerticalScrollIndicator={false}>
      {notes.length > 0 && <View style={styles.notesCol}>{notes}</View>}
      <View style={styles.activeArea}>
        <ActiveView flow={flow} orientation={orientation} />
      </View>
    </ScrollView>
  );

  if (orientation === 'landscape') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.landscapeBody}>
          <Rail
            screenName={railName}
            connection={railConnection}
            sourceCount={sources.length}
            sessionCode={SESSION_CODE}
            onPressSession={actions.toggleAccount}
          />
          <SavedStrip active={state.screen === 'saved'} hasDrops={hasDrops} onPress={actions.openSaved} />
          <View style={styles.contentCol}>
            {scrollableContent}
            {popups}
          </View>
        </View>
        {actionBar}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.portraitBody}>
        <View style={styles.portraitHeaderBar}>
          <Text style={styles.portraitTitle}>{railName}</Text>
          <View style={styles.portraitHeaderRight}>
            <View style={[styles.connectionPill, railConnection === 'LIVE' && styles.connectionPillLive]}>
              <Text style={[styles.connectionPillText, railConnection === 'LIVE' && styles.connectionPillTextLive]}>{railConnection}</Text>
            </View>
            <SavedPill hasDrops={hasDrops} onPress={actions.openSaved} />
            <Pressable onPress={actions.toggleAccount} accessibilityLabel="Account">
              <Text style={styles.sessionCode}>{SESSION_CODE}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.contentCol}>
          {scrollableContent}
          {popups}
        </View>
      </View>
      {actionBar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SiftColors.void },
  landscapeBody: { flex: 1, flexDirection: 'row', minHeight: 0, minWidth: 0 },
  contentCol: { flex: 1, minHeight: 0, minWidth: 0, position: 'relative' },
  notesCol: { gap: 1 },
  activeScroll: { flex: 1 },
  activeScrollContent: { flexGrow: 1, backgroundColor: SiftColors.void },
  activeArea: { flex: 1, minHeight: 0 },
  portraitBody: { flex: 1, minHeight: 0 },
  portraitHeaderBar: {
    height: 48,
    backgroundColor: SiftColors.carbon,
    borderBottomWidth: 1,
    borderBottomColor: SiftColors.graphite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SiftSpacing.space4,
  },
  portraitTitle: {
    fontFamily: 'BigShouldersDisplay_700Bold',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
    color: SiftColors.bone,
  },
  portraitHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectionPill: { paddingVertical: 3, paddingHorizontal: 6 },
  connectionPillLive: { backgroundColor: SiftColors.mint },
  connectionPillText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 11, letterSpacing: 0.88, color: SiftColors.boneDim },
  connectionPillTextLive: { color: SiftColors.void },
  sessionCode: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 0.9, color: SiftColors.boneDim },
  popupAnchor: { position: 'absolute', zIndex: 5 },
  popupAnchorAbove: { zIndex: 6 },
  popupAnchorLandscape: { right: 12, bottom: 12 },
  popupAnchorPortrait: { left: 12, right: 12, bottom: 12 },
});
