import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DotMatrix } from '@/components/sift/DotMatrix';
import { ScanSweep } from '@/components/sift/ScanSweep';
import { SiftMark } from '@/components/sift/SiftMark';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { useAuth } from '@/hooks/use-auth';
import { useOrientation } from '@/hooks/use-orientation';
import { useOrientationPolicy } from '@/hooks/use-orientation-policy';

/**
 * Long enough for the sweep to read as a boot sequence rather than a flicker,
 * short enough that it never becomes the reason launch feels slow. Auth
 * usually resolves inside it, so the splash costs nothing in practice.
 */
const MIN_SPLASH_MS = 1400;

/**
 * The launch route: SIFT's boot screen, and the gate in front of everything
 * else. It holds until Firebase has said whether there is a session, then
 * hands off to the app or to the auth screen. Tapping skips the wait.
 */
export default function SplashScreen() {
  useOrientationPolicy();
  const orientation = useOrientation();
  const { phase } = useAuth();
  const [elapsed, setElapsed] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: MIN_SPLASH_MS, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => setElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // 'loading' is Firebase still restoring a persisted session; anything else is an answer.
  const resolved = phase !== 'loading';

  if (elapsed && resolved) {
    return <Redirect href={phase === 'ready' ? '/app' : '/auth'} />;
  }

  const status = (
    <>
      <Text style={styles.status}>{'//INITIALIZING_SESSION'}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </>
  );

  const skip = () => {
    if (resolved) router.replace(phase === 'ready' ? '/app' : '/auth');
  };

  if (orientation === 'landscape') {
    return (
      <Pressable style={styles.screen} onPress={skip} accessibilityLabel="Skip splash">
        <DotMatrix density="lo" />
        <ScanSweep direction="vertical" />
        <View style={styles.landscapeBody}>
          <View style={styles.landscapeBrand}>
            <SiftMark width={40} />
            <Text style={[styles.wordmark, styles.wordmarkLandscape]}>SIFT</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.landscapeStatus}>{status}</View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.screen} onPress={skip} accessibilityLabel="Skip splash">
      <DotMatrix density="lo" />
      <ScanSweep direction="vertical" />
      <View style={styles.portraitBody}>
        <View style={styles.portraitBrand}>
          <SiftMark width={46} />
          <Text style={styles.wordmark}>SIFT</Text>
        </View>
      </View>
      <View style={styles.portraitStatus}>{status}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SiftColors.void, overflow: 'hidden' },

  portraitBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  portraitBrand: { alignItems: 'center', gap: SiftSpacing.space4 },
  portraitStatus: {
    position: 'absolute',
    bottom: 113,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: SiftSpacing.space3,
  },

  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SiftSpacing.space7,
  },
  landscapeBrand: { alignItems: 'center', gap: SiftSpacing.space3 },
  landscapeStatus: { alignItems: 'flex-start', gap: SiftSpacing.space3 },
  divider: { width: 1, height: 100, backgroundColor: SiftColors.graphite },

  wordmark: {
    fontFamily: SiftFontFamily.display,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.88,
    color: SiftColors.bone,
  },
  wordmarkLandscape: { fontSize: 40, lineHeight: 40, letterSpacing: -0.8 },

  status: { ...SiftType.label, color: SiftColors.mint, textTransform: 'uppercase' },
  barTrack: { width: 160, height: 3, backgroundColor: SiftColors.slate, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: SiftColors.mint },
});
