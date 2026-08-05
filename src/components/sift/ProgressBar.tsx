import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftType } from '@/constants/sift-theme';

interface ProgressBarProps {
  value?: number;
  label?: string;
  alert?: boolean;
  onLight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value = 0, label, alert = false, onLight = false, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { width: `${pct * 100}%`, backgroundColor: alert ? SiftColors.ember : SiftColors.void },
        ]}
      />
      {label && (
        <Text style={[styles.label, { color: onLight ? SiftColors.void : SiftColors.bone }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'relative', height: 14, backgroundColor: SiftColors.slate, width: '100%', overflow: 'hidden' },
  label: {
    ...SiftType.annot,
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    textTransform: 'uppercase',
  },
});
