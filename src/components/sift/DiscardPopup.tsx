import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Button } from './Button';
import { Popup } from './Popup';

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
    <Popup sigil="!" text="DISCARD_RESULT" suffix={domain} onClose={onClose} closeLabel="Close discard panel">
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
    </Popup>
  );
}

const styles = StyleSheet.create({
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space3 },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },
  buttons: { flexDirection: 'row', gap: SiftSpacing.space2 },
  button: { flex: 1, height: 40 },
});
