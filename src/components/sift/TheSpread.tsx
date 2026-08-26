import { useState } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { POINT_WIDTH, layoutPoints } from '@/lib/spread-layout';
import { Tag } from './Tag';

export interface SpreadPoint {
  value: number;
  priceLabel: string;
  label: string;
}

interface TheSpreadProps {
  points: SpreadPoint[];
  spreadLabel: string;
  /** Opens the listing behind a point. Index is into `points`. */
  onSelect?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function TheSpread({ points, spreadLabel, onSelect, style }: TheSpreadProps) {
  const [width, setWidth] = useState(0);
  const prices = points.map((p) => p.value);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const lefts = width > 0 ? layoutPoints(prices, width) : [];
  // The median line marks a value, not a point, so it stays where the value is.
  const medianLeft = ((median - min) / (max - min || 1)) * width;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.legend}>
        <Text style={styles.legendText}>LOWEST</Text>
        <Text style={styles.legendText}>HIGHEST</Text>
      </View>
      <View style={styles.track} onLayout={onLayout}>
        {width > 0 && (
          <>
            <View style={[styles.medianLine, { left: medianLeft }]} />
            {points.map((p, i) => (
              <Pressable
                key={i}
                onPress={onSelect ? () => onSelect(i) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}, ${p.priceLabel}`}
                style={[styles.point, { left: lefts[i] }]}>
                <Text
                  style={[
                    styles.pointPrice,
                    { color: p.value === min ? SiftColors.mint : p.value === max ? SiftColors.ember : SiftColors.bone },
                  ]}
                  numberOfLines={1}>
                  {p.priceLabel}
                </Text>
                <View style={styles.tick} />
                <Text style={styles.pointLabel} numberOfLines={1}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Tag label="LOWEST" tone="mint" />
        <Text style={styles.spreadLabel}>{spreadLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingVertical: SiftSpacing.space4 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SiftSpacing.space5,
  },
  legendText: { ...SiftType.label, color: SiftColors.boneDim, textTransform: 'uppercase' },
  track: { position: 'relative', height: 60 },
  medianLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: SiftColors.graphite,
  },
  point: { position: 'absolute', top: 0, width: POINT_WIDTH, alignItems: 'center' },
  pointPrice: { ...SiftType.priceM },
  tick: { width: 1, height: 24, backgroundColor: SiftColors.boneDim, marginVertical: 4 },
  pointLabel: { ...SiftType.annot, color: SiftColors.boneDim, textTransform: 'uppercase' },
  divider: { borderTopWidth: 1, borderColor: SiftColors.graphite, marginVertical: SiftSpacing.space6 - SiftSpacing.space3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.space3 },
  spreadLabel: { ...SiftType.annot, color: SiftColors.boneDim, textTransform: 'uppercase' },
});
