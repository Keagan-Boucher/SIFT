import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { DotMatrix } from './DotMatrix';
import { HeaderStrip } from './HeaderStrip';
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
    <View style={[styles.card, style]}>
      {/* Same header strip the search tiles carry, with the 0-1 score mapped
          onto the four badge squares those tiles use. */}
      <HeaderStrip tier={low ? 4 : 3} confidence={Math.round(confidence * 4)} />
      <View style={styles.row}>
        <View style={styles.thumb}>
          <DotMatrix density="mid" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.price}>{price}</Text>
          <ProgressBar value={confidence} label={`${Math.round(confidence * 100)}%`} alert={low} onLight style={styles.bar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: SiftColors.slate },
  row: { flexDirection: 'row', gap: SiftSpacing.space3, padding: SiftSpacing.space3 },
  thumb: { position: 'relative', width: 56, height: 56, overflow: 'hidden', backgroundColor: SiftColors.carbon },
  info: { flex: 1, justifyContent: 'center', gap: 6 },
  title: { ...SiftType.title, color: SiftColors.bone },
  price: { ...SiftType.priceM, color: SiftColors.bone },
  // Light track, dark fill: the bar's own fill colour is void, so it only
  // reads as filled against a light track.
  bar: { backgroundColor: SiftColors.paperHi },
});
