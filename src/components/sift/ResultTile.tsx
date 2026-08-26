import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftType } from '@/constants/sift-theme';
import { CountChip } from './CountChip';
import { DotMatrix } from './DotMatrix';
import { HeaderStrip } from './HeaderStrip';
import { Tag } from './Tag';

interface ResultTileProps {
  title?: string;
  tier?: 1 | 2 | 3 | 4 | 5;
  confidence?: number;
  price: string;
  retailer: string;
  count?: number;
  lowest?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ResultTile({
  title,
  tier = 3,
  confidence = 3,
  price,
  retailer,
  count,
  lowest = false,
  style,
}: ResultTileProps) {
  return (
    <View style={[styles.tile, style]} accessibilityLabel={retailer}>
      <HeaderStrip tier={tier} confidence={confidence} />
      <View style={styles.image}>
        <DotMatrix density="mid" />
        {!!title && (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        )}
        {!!count && count > 1 && (
          <View style={styles.countBadge}>
            <CountChip count={count} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={styles.price}>{price}</Text>
        {lowest && <Tag label="LOWEST" tone="mint" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'relative',
    width: 160,
    height: 96,
    backgroundColor: SiftColors.slate,
  },
  image: { position: 'relative', flex: 1, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 6 },
  title: { ...SiftType.annot, color: SiftColors.paperHi },
  countBadge: { position: 'absolute', bottom: 4, right: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  price: { ...SiftType.priceL, color: SiftColors.bone },
});
