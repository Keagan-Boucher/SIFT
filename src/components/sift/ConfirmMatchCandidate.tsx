import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { ProgressBar } from './ProgressBar';

interface ConfirmMatchCandidateProps {
  title: string;
  price: string;
  confidence: number;
  style?: StyleProp<ViewStyle>;
}

export function ConfirmMatchCandidate({ title, price, confidence, style }: ConfirmMatchCandidateProps) {
  const low = confidence < 0.6;
  return (
    <View style={[styles.row, style]}>
      <View style={styles.rail} />
      <View style={styles.thumb} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.price}>{price}</Text>
        <ProgressBar
          value={confidence}
          label={`${Math.round(confidence * 100)}%`}
          alert={low}
          onLight
          style={{ backgroundColor: SiftColors.paperHi }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SiftSpacing.space3,
    padding: SiftSpacing.space3,
    backgroundColor: SiftColors.paper,
  },
  rail: { width: 20, backgroundColor: SiftColors.paperHi },
  thumb: { width: 56, height: 56, backgroundColor: SiftColors.paperHi },
  info: { flex: 1, justifyContent: 'center', gap: 6 },
  title: { ...SiftType.title, color: SiftColors.onLight },
  price: { ...SiftType.priceM, color: SiftColors.onLight },
});
