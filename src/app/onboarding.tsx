import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SiftMark } from '@/components/sift/SiftMark';
import { Button, Label } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { useOrientation } from '@/hooks/use-orientation';
import { useOrientationPolicy } from '@/hooks/use-orientation-policy';
import { hasSeenTour, markTourSeen } from '@/lib/onboarding';

/**
 * The core loop and nothing else. Confirming matches, fixing a failed site and
 * the watchlist explain themselves in place, so putting them here would only
 * pad the tour someone is trying to skip.
 */
const CARDS = [
  {
    heading: 'Any shop you like',
    body: 'Type the product and Sift suggests where to look. Add any other retailer by its URL; you are not stuck with a fixed list.',
  },
  {
    heading: 'Watch it fill in',
    body: 'Prices arrive as each site answers, with nothing to refresh. Leave whenever you like and pick it up from the home screen.',
  },
  {
    heading: 'Read the band',
    body: 'Every price sits in the band from lowest to highest. Buy near the bottom of it, not at the single lowest number. Turn sideways for the full view.',
  },
] as const;

export default function OnboardingScreen() {
  useOrientationPolicy();
  const landscape = useOrientation() === 'landscape';
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

  if (seen === null) return <View style={styles.screen} />;
  if (seen) return <Redirect href="/app" />;

  const ticks = (
    <View style={styles.ticks} accessibilityLabel={`Step ${step + 1} of ${CARDS.length}`}>
      {CARDS.map((entry, index) => (
        <Pressable key={entry.heading} onPress={() => setStep(index)} accessibilityLabel={`Go to step ${index + 1}`} hitSlop={12} style={styles.tickHit}>
          <View style={[styles.tick, { backgroundColor: index <= step ? SiftColors.mint : SiftColors.track }]} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={landscape ? ['top', 'bottom', 'left', 'right'] : ['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <SiftMark width={18} />
          <Text style={styles.wordmark}>SIFT</Text>
        </View>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={12}>
          <Label>SKIP</Label>
        </Pressable>
      </View>
      <View style={[styles.body, landscape && styles.bodyLandscape]}>
        <View style={styles.copy}>
          {ticks}
          <Text style={styles.heading}>{card.heading}</Text>
          <Text style={styles.text}>{card.body}</Text>
        </View>
        <Button label={last ? 'Start' : 'Next'} arrow onPress={next} style={landscape ? styles.buttonLandscape : undefined} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SiftColors.canvas },
  header: { height: 44, paddingHorizontal: SiftSpacing.s5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s2 },
  wordmark: { fontFamily: SiftFontFamily.monoBold, fontSize: 13, letterSpacing: 1, color: SiftColors.text },
  body: { flex: 1, padding: SiftSpacing.s5, justifyContent: 'space-between' },
  bodyLandscape: { flexDirection: 'row', alignItems: 'flex-end', gap: SiftSpacing.s7 },
  copy: { flex: 1, justifyContent: 'center', gap: SiftSpacing.s4, maxWidth: 460 },
  heading: { ...SiftType.title, color: SiftColors.text },
  text: { ...SiftType.body, color: SiftColors.textDim },
  ticks: { flexDirection: 'row', gap: 6, marginBottom: SiftSpacing.s3 },
  tickHit: { paddingVertical: SiftSpacing.s2 },
  tick: { width: 28, height: 3, borderRadius: 1 },
  buttonLandscape: { minWidth: 188 },
});
