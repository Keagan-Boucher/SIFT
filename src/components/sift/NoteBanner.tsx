import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftType } from '@/constants/sift-theme';

export type NoteKind = 'block' | 'prompt' | 'drop';

const NOTE_COLOR: Record<NoteKind, string> = {
  block: SiftColors.ember,
  prompt: SiftColors.acid,
  drop: SiftColors.mint,
};

const NOTE_SIGIL: Record<NoteKind, string> = {
  block: '!',
  prompt: '>',
  drop: '//',
};

interface NoteBannerProps {
  kind: NoteKind;
  heading: string;
  body: string;
  /** Omitted for a note with nothing to dismiss, e.g. a staged-link confirmation. */
  onDismiss?: () => void;
  /** Set alongside onRetry to show the "paste a search URL" action. */
  retryable?: boolean;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function NoteBanner({ kind, heading, body, onDismiss, retryable, onRetry, style }: NoteBannerProps) {
  const color = NOTE_COLOR[kind];
  return (
    <View style={[styles.row, { borderColor: color }, style]}>
      <Text style={[styles.heading, { color }]}>
        {NOTE_SIGIL[kind]}
        {heading}
      </Text>
      <Text style={styles.body} numberOfLines={1}>
        {body}
      </Text>
      {retryable && onRetry && (
        <Pressable onPress={onRetry} style={[styles.retry, { borderColor: color }]}>
          <Text style={[styles.retryLabel, { color }]}>PASTE URL</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} style={[styles.dismiss, { backgroundColor: color }]}>
          <Text style={styles.dismissLabel}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
    backgroundColor: SiftColors.carbon,
    borderWidth: 2,
    paddingLeft: 10,
  },
  heading: { ...SiftType.label, flexShrink: 0 },
  body: { fontFamily: SiftFontFamily.system, fontSize: 11, lineHeight: 16, color: SiftColors.bone, flex: 1 },
  retry: {
    flexShrink: 0,
    height: 22,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { ...SiftType.annot, letterSpacing: 0.6 },
  dismiss: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dismissLabel: { color: SiftColors.void, fontSize: 15, fontWeight: '700', lineHeight: 15 },
});
