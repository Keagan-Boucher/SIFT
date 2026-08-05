import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftTier } from '@/constants/sift-theme';

interface HeaderStripProps {
  tier?: 1 | 2 | 3 | 4 | 'unresolved';
  glyph?: string;
  confidence?: number;
  style?: StyleProp<ViewStyle>;
}

export function HeaderStrip({ tier = 'unresolved', glyph = '⌸', confidence = 0, style }: HeaderStripProps) {
  const squares = [0, 1, 2, 3];
  return (
    <View style={[styles.strip, { backgroundColor: SiftTier[tier] ?? SiftTier.unresolved }, style]}>
      <Text style={styles.glyph}>{glyph}</Text>
      <View style={styles.indicators}>
        {squares.map((i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              { backgroundColor: i < confidence ? SiftColors.void : 'transparent' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: SiftSpacing.stripHeight,
    paddingHorizontal: SiftSpacing.space2,
  },
  glyph: { fontSize: SiftSpacing.stripGlyph, color: SiftColors.void, lineHeight: SiftSpacing.stripGlyph },
  indicators: { flexDirection: 'row', gap: 3 },
  indicator: {
    width: SiftSpacing.stripIndicator,
    height: SiftSpacing.stripIndicator,
    borderWidth: 1,
    borderColor: SiftColors.void,
  },
});
