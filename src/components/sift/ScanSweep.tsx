import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { SiftColors } from '@/constants/sift-theme';

type Direction = 'horizontal' | 'vertical';

/** Band thickness, travel and period per axis. Vertical is the slower splash sweep. */
const SWEEP: Record<Direction, { size: number; distance: number; duration: number }> = {
  horizontal: { size: 140, distance: 900, duration: 1400 },
  vertical: { size: 120, distance: 900, duration: 5500 },
};

interface ScanSweepProps {
  direction?: Direction;
}

/** The one continuous animation the design system permits — means "a scrape is running". */
export function ScanSweep({ direction = 'horizontal' }: ScanSweepProps) {
  const { size, distance, duration } = SWEEP[direction];
  const offset = useSharedValue(-size);

  useEffect(() => {
    offset.value = -size;
    offset.value = withRepeat(withTiming(distance, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(offset);
  }, [offset, size, distance, duration]);

  const vertical = direction === 'vertical';

  const style = useAnimatedStyle(() => ({
    transform: [vertical ? { translateY: offset.value } : { translateX: offset.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <Animated.View style={[vertical ? { ...styles.sweepVertical, height: size } : { ...styles.sweep, width: size }, style]}>
        <LinearGradient
          colors={['transparent', `${SiftColors.mint}24`, SiftColors.mint]}
          start={{ x: 0, y: 0 }}
          end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0 },
  sweepVertical: { position: 'absolute', left: 0, right: 0 },
});
