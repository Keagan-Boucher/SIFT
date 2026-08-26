import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftType } from '@/constants/sift-theme';

interface SavedStripProps {
  active: boolean;
  presetsActive: boolean;
  hasDrops: boolean;
  onPress: () => void;
  onPressPresets: () => void;
}

/** Vertical tab next to the Rail (landscape chrome), split SAVED over PRESETS. */
export function SavedStrip({ active, presetsActive, hasDrops, onPress, onPressPresets }: SavedStripProps) {
  return (
    <View style={styles.strip}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Saved searches"
        style={[styles.half, { backgroundColor: active ? SiftColors.slate : SiftColors.carbon }]}>
        <Text style={[styles.label, { color: active ? SiftColors.bone : SiftColors.boneDim }]}>SAVED</Text>
        {hasDrops && <View style={styles.dot} />}
      </Pressable>
      <Pressable
        onPress={onPressPresets}
        accessibilityRole="button"
        accessibilityLabel="Source presets"
        style={[styles.half, styles.halfSecond, { backgroundColor: presetsActive ? SiftColors.slate : SiftColors.carbon }]}>
        <Text style={[styles.label, { color: presetsActive ? SiftColors.bone : SiftColors.boneDim }]}>PRESETS</Text>
      </Pressable>
    </View>
  );
}

/** The same split as a two-section pill for the portrait top header bar. */
export function SavedPill({
  active,
  presetsActive,
  hasDrops,
  onPress,
  onPressPresets,
}: {
  active: boolean;
  presetsActive: boolean;
  hasDrops: boolean;
  onPress: () => void;
  onPressPresets: () => void;
}) {
  return (
    <View style={styles.pill}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Saved searches"
        style={[styles.pillHalf, active && styles.pillHalfActive]}>
        <Text style={styles.pillLabel}>SAVED</Text>
        {hasDrops && <Text style={styles.pillDot}>●</Text>}
      </Pressable>
      <Pressable
        onPress={onPressPresets}
        accessibilityRole="button"
        accessibilityLabel="Source presets"
        style={[styles.pillHalf, styles.pillHalfSecond, presetsActive && styles.pillHalfActive]}>
        <Text style={styles.pillLabel}>PRESETS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: 28,
    borderRightWidth: 1,
    borderRightColor: SiftColors.graphite,
  },
  half: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  halfSecond: { borderTopWidth: 1, borderTopColor: SiftColors.graphite },
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
    alignItems: 'stretch',
    height: 24,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  pillHalf: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  pillHalfSecond: { borderLeftWidth: 1, borderLeftColor: SiftColors.graphite },
  pillHalfActive: { backgroundColor: SiftColors.slate },
  pillLabel: { fontFamily: SiftType.label.fontFamily, fontSize: 9, letterSpacing: 0.8, color: SiftColors.bone },
  pillDot: { color: SiftColors.mint, fontSize: 9 },
});
