import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { SiftColors } from '@/constants/sift-theme';

interface PlusGridProps {
  cell?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Marks empty slots with small crosses at grid intersections — never draws boxes. */
export function PlusGrid({ cell = 24, color = SiftColors.graphite, style }: PlusGridProps) {
  const patternId = `plus-grid-${useId()}`;
  const c = cell / 2;
  return (
    <View style={[StyleSheet.absoluteFill, styles.noEvents, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={patternId} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <Path d={`M ${c - 3} ${c} h6 M ${c} ${c - 3} v6`} stroke={color} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} opacity={0.6} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  noEvents: { overflow: 'hidden' },
});
