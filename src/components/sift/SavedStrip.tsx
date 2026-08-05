import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftType } from '@/constants/sift-theme';

interface SavedStripProps {
  active: boolean;
  hasDrops: boolean;
  onPress: () => void;
}

/** Vertical "SAVED" tab next to the Rail (landscape chrome). */
export function SavedStrip({ active, hasDrops, onPress }: SavedStripProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.strip, { backgroundColor: active ? SiftColors.slate : SiftColors.carbon }]}>
      <View />
      <Text style={[styles.label, { color: active ? SiftColors.bone : SiftColors.boneDim }]}>SAVED</Text>
      {hasDrops ? <View style={styles.dot} /> : <View />}
    </Pressable>
  );
}

/** "SAVED" pill for the portrait top header bar. */
export function SavedPill({ hasDrops, onPress }: { hasDrops: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <Text style={styles.pillLabel}>SAVED</Text>
      {hasDrops && <Text style={styles.pillDot}>●</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: 28,
    borderRightWidth: 1,
    borderRightColor: SiftColors.graphite,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontFamily: SiftType.label.fontFamily,
    fontSize: 9,
    letterSpacing: 1,
    transform: [{ rotate: '-90deg' }],
    width: 60,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SiftColors.mint },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  pillLabel: { fontFamily: SiftType.label.fontFamily, fontSize: 9, letterSpacing: 0.8, color: SiftColors.bone },
  pillDot: { color: SiftColors.mint, fontSize: 9 },
});
