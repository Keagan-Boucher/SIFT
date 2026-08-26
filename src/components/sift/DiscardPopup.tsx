import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Button } from './Button';
import { CommandHeading } from './CommandHeading';

interface DiscardPopupProps {
  domain: string;
  onDiscard: () => void;
  onClose: () => void;
}

/**
 * Nothing this source returned is the product the user asked for. Delisting
 * drops it from this run only: every other source keeps its price, and the
 * next search asks this one again.
 */
export function DiscardPopup({ domain, onDiscard, onClose }: DiscardPopupProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CommandHeading sigil="!" text="DISCARD_RESULT" suffix={domain} />
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close discard panel">
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.blurb}>
          Nothing from {domain} will be shown for this search. Every other source keeps its price, and this one is
          asked again next time.
        </Text>
        <View style={styles.buttons}>
          <Button variant="ghost" onPress={onClose} style={styles.button}>
            KEEP
          </Button>
          <Button variant="primary" onPress={onDiscard} style={styles.button}>
            DISCARD
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 344,
    backgroundColor: SiftColors.void,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  header: {
    height: 28,
    backgroundColor: SiftColors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SiftSpacing.space3,
  },
  close: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { fontFamily: SiftFontFamily.system, fontSize: 14, color: SiftColors.boneDim },
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space3 },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },
  buttons: { flexDirection: 'row', gap: SiftSpacing.space2 },
  button: { flex: 1, height: 40 },
});
