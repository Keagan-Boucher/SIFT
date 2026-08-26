import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';

export type SourceStatus = 'PENDING' | 'KNOWN' | 'RESOLVED' | 'BLOCKED' | 'FAILED';

const STATUS: Record<SourceStatus, { bg: string; text: string; hazard?: boolean }> = {
  PENDING: { bg: SiftColors.graphite, text: SiftColors.bone },
  // Already solved in the registry, before this search has run.
  KNOWN: { bg: SiftColors.mint, text: SiftColors.void },
  RESOLVED: { bg: SiftColors.mint, text: SiftColors.void },
  BLOCKED: { bg: SiftColors.ember, text: SiftColors.void, hazard: true },
  FAILED: { bg: SiftColors.ember, text: SiftColors.void },
};

interface SourceChipProps {
  domain: string;
  status?: SourceStatus;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SourceChip({ domain, status = 'PENDING', onPress, style }: SourceChipProps) {
  const s = STATUS[status] ?? STATUS.PENDING;
  const content = (
    <View style={[styles.row, style]}>
      <Text style={styles.domain}>{domain}</Text>
      <View style={[styles.status, { backgroundColor: s.bg }]}>
        <Text style={[styles.statusLabel, { color: s.text }]}>{status}</Text>
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    backgroundColor: SiftColors.carbon,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  domain: {
    ...SiftType.label,
    paddingHorizontal: SiftSpacing.space2,
    color: SiftColors.bone,
    textTransform: 'uppercase',
  },
  status: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: SiftSpacing.space2,
  },
  statusLabel: {
    ...SiftType.label,
  },
});
