import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors } from '@/constants/sift-theme';
import { CommandHeading, type Sigil } from './CommandHeading';

interface PopupProps {
  sigil?: Sigil;
  text: string;
  suffix?: string;
  onClose: () => void;
  /** Screen-reader name for the close button, e.g. "Close account panel". */
  closeLabel?: string;
  /** Per-popup width and height caps; the shell is 344 wide and uncapped. */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * The chrome every SIFT panel shares: a hard-edged box with a slate title bar,
 * its command heading and a bordered close button. Only the body differs, so
 * that is all a popup supplies.
 */
export function Popup({ sigil, text, suffix, onClose, closeLabel = 'Close panel', style, children }: PopupProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.header}>
        <CommandHeading sigil={sigil} text={text} suffix={suffix} />
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel={closeLabel}>
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 344,
    flexShrink: 1,
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
    paddingLeft: 8,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: SiftColors.graphite,
  },
  closeGlyph: { color: SiftColors.bone, fontSize: 14, lineHeight: 14 },
});
