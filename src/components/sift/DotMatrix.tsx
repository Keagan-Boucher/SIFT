import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { SiftMatrix } from '@/constants/sift-theme';

type Density = keyof typeof SiftMatrix;

interface DotMatrixProps {
  density?: Density;
  style?: StyleProp<ViewStyle>;
}

/** Ambient dot-field texture. Must only sit under empty space or real data, never populated UI. */
export function DotMatrix({ density = 'lo', style }: DotMatrixProps) {
  const d = SiftMatrix[density] ?? SiftMatrix.lo;
  const patternId = `dot-matrix-${useId()}`;
  return (
    <View style={[StyleSheet.absoluteFill, styles.noEvents, { opacity: d.opacity }, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={patternId} width={d.pitch} height={d.pitch} patternUnits="userSpaceOnUse">
            <Circle cx={d.pitch / 2} cy={d.pitch / 2} r={d.dot / 2} fill={d.color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  noEvents: { overflow: 'hidden' },
});
