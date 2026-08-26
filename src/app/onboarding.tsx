import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/sift/Button';
import { CommandHeading } from '@/components/sift/CommandHeading';
import { DotMatrix } from '@/components/sift/DotMatrix';
import { SiftMark } from '@/components/sift/SiftMark';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { useOrientation } from '@/hooks/use-orientation';
import { useOrientationPolicy } from '@/hooks/use-orientation-policy';
import { hasSeenTour, markTourSeen } from '@/lib/onboarding';

/**
 * The core loop and nothing else. Confirm-matches, saved watches and the
 * dashboard are all reachable from the app itself and explain themselves in
 * place, so putting them here would only pad the tour someone is trying to
 * skip.
 */
const CARDS = [
  {
    heading: 'STAGE_YOUR_SOURCES',
    body: 'Paste any retailer you already shop at. SIFT works out where the product lives on each site, so you are not stuck with a fixed list of stores.',
  },
  {
    heading: 'WATCH_IT_RUN',
    body: 'Prices arrive as each source answers, with nothing to refresh. A source that fails says why, and you can hand it a search URL to try again.',
  },
  {
    heading: 'READ_THE_SPREAD',
    body: 'Every result is plotted against the median, so you can see what a fair price looks like rather than just the smallest number. Turn sideways for the full width.',
  },
] as const;

export default function OnboardingScreen() {
  useOrientationPolicy();
  const orientation = useOrientation();
  const [step, setStep] = useState(0);
  // null while the flag is still being read: rendering the tour before knowing
  // would flash it at someone who has already dismissed it.
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenTour().then(setSeen);
  }, []);

  const card = CARDS[step];
  const last = step === CARDS.length - 1;

  function finish(): void {
    void markTourSeen();
    router.replace('/app');
  }

  function next(): void {
    if (last) return finish();
    setStep(step + 1);
  }

  if (seen === null) {
    return <View style={styles.screen} />;
  }

  if (seen) {
    return <Redirect href="/app" />;
  }

  const counter = `${String(step + 1).padStart(2, '0')}/${String(CARDS.length).padStart(2, '0')}`;

  const ticks = (
    <View style={styles.ticks} accessibilityLabel={`Step ${step + 1} of ${CARDS.length}`}>
      {CARDS.map((entry, index) => (
        <Pressable
          key={entry.heading}
          onPress={() => setStep(index)}
          accessibilityLabel={`Go to step ${index + 1}`}
          hitSlop={8}>
          <View style={[styles.tick, index === step && styles.tickActive]} />
        </Pressable>
      ))}
    </View>
  );

  const skip = (
    <Pressable onPress={finish} accessibilityLabel="Skip the tour" hitSlop={8}>
      <Text style={styles.skip}>SKIP</Text>
    </Pressable>
  );

  const copy = (
    <>
      <Text style={styles.counter}>{counter}</Text>
      <CommandHeading sigil=">" text={card.heading} style={styles.heading} />
      <Text style={styles.body}>{card.body}</Text>
    </>
  );

  if (orientation === 'landscape') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
        <DotMatrix density="lo" />
        <View style={styles.landscapeBody}>
          <View style={styles.landscapeAside}>
            <SiftMark width={32} />
            <Text style={styles.wordmark}>SIFT</Text>
            {ticks}
          </View>
          <View style={styles.divider} />
          <View style={styles.landscapeMain}>
            <View style={styles.copyCol}>{copy}</View>
            <View style={styles.landscapeActions}>
              {skip}
              <Button variant="primary" onPress={next}>
                {last ? 'START' : 'NEXT'}
              </Button>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <DotMatrix density="lo" />
      <View style={styles.portraitBody}>
        <View style={styles.portraitHeader}>
          <View style={styles.wordmarkRow}>
            <SiftMark width={24} />
            <Text style={styles.wordmark}>SIFT</Text>
          </View>
          {skip}
        </View>
        <View style={styles.copyCol}>{copy}</View>
        <View style={styles.portraitFooter}>
          {ticks}
          <Button variant="primary" onPress={next} style={styles.fullWidth}>
            {last ? 'START' : 'NEXT'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SiftColors.void },

  portraitBody: { flex: 1, paddingHorizontal: SiftSpacing.space5, paddingVertical: SiftSpacing.space5 },
  portraitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  portraitFooter: { gap: SiftSpacing.space5 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.space2 },

  landscapeBody: { flex: 1, flexDirection: 'row', paddingVertical: SiftSpacing.space4 },
  landscapeAside: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SiftSpacing.space4,
  },
  landscapeMain: {
    flex: 1,
    paddingHorizontal: SiftSpacing.space5,
    paddingVertical: SiftSpacing.space3,
  },
  landscapeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SiftSpacing.space5,
  },
  divider: { width: 1, backgroundColor: SiftColors.graphite },

  copyCol: { flex: 1, justifyContent: 'center', gap: SiftSpacing.space3, maxWidth: 460 },
  wordmark: { ...SiftType.displayM, color: SiftColors.bone, textTransform: 'uppercase' },
  counter: { ...SiftType.annot, color: SiftColors.boneDim },
  heading: { ...SiftType.displayL, color: SiftColors.acid },
  body: { ...SiftType.body, color: SiftColors.paper },
  skip: { ...SiftType.label, color: SiftColors.boneDim, textTransform: 'uppercase' },

  ticks: { flexDirection: 'row', gap: SiftSpacing.space2 },
  tick: { width: 18, height: 3, backgroundColor: SiftColors.graphite },
  tickActive: { backgroundColor: SiftColors.acid },

  fullWidth: { width: '100%' },
});
