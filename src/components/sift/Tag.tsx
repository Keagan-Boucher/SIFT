import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';

export type TagTone = 'mint' | 'acid' | 'ember' | 'current' | 'neutral';

const TONE: Record<TagTone, string> = {
  mint: SiftColors.mint,
  acid: SiftColors.acid,
  ember: SiftColors.ember,
  current: SiftColors.current,
  neutral: SiftColors.boneDim,
};

interface TagProps {
  label: string;
  tone?: TagTone;
  style?: StyleProp<ViewStyle>;
}

export function Tag({ label, tone = 'mint', style }: TagProps) {
  return (
    <View style={[styles.base, { backgroundColor: TONE[tone] ?? TONE.mint }, style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 20,
    paddingHorizontal: SiftSpacing.space2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...SiftType.label,
    color: SiftColors.onSignal,
    textTransform: 'uppercase',
  },
});
