import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { SiftColors } from '@/constants/sift-theme';

const SWEEP_WIDTH = 140;
const SWEEP_DISTANCE = 900;
const SWEEP_DURATION = 1400;

/** The one continuous animation the design system permits — means "a scrape is running". */
export function ScanSweep() {
  const x = useSharedValue(-SWEEP_WIDTH);

  useEffect(() => {
    x.value = -SWEEP_WIDTH;
    x.value = withRepeat(withTiming(SWEEP_DISTANCE, { duration: SWEEP_DURATION, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <Animated.View style={[styles.sweep, style]}>
        <LinearGradient
          colors={['transparent', `${SiftColors.mint}24`, SiftColors.mint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0, width: SWEEP_WIDTH },
});
