import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { SiftColors, SiftFontFamily, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * The box draws focus in mint. Chrome's "auto" ring ignores colour and width,
 * so on web it has to be switched off by style; RN's types do not list 'none'.
 */
const WEB_NO_FOCUS_RING = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hairline, style]} />;
}

export function Label({ children, color = SiftColors.textMute }: { children: ReactNode; color?: string }) {
  return <Text style={[SiftType.label, { color }]}>{children}</Text>;
}

/** A 6 px status dot. Ember for a problem, mint for good news, grey for neutral. */
export function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Acid primary, one per screen. Ghost for the secondary. */
export function Button({ label, onPress, variant = 'primary', disabled, arrow, style }: ButtonProps) {
  const primary = variant === 'primary';
  const color = disabled ? SiftColors.textMute : primary ? SiftColors.onAccent : SiftColors.textDim;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        disabled && styles.buttonDisabled,
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}>
      <Text style={[styles.buttonLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {arrow && <Icon name="arrow" size={11} color={color} />}
    </Pressable>
  );
}

interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Applies to the box, not the text. */
  style?: StyleProp<ViewStyle>;
  /** Mint label drawn inside the box, above the value. */
  label?: string;
  mono?: boolean;
  big?: boolean;
}

/** surfaceHi field, mint border and caret while focused. */
export function Input({ label, mono, big, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputBox, focused && styles.inputFocused, style]}>
      {label && <Text style={[SiftType.labelBold, { color: SiftColors.mint }]}>{label}</Text>}
      <TextInput
        disableFullscreenUI
        placeholderTextColor={SiftColors.textMute}
        cursorColor={SiftColors.mint}
        selectionColor={SiftColors.mint}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          WEB_NO_FOCUS_RING,
          mono ? { fontFamily: SiftFontFamily.mono, fontSize: 14 } : { fontFamily: SiftFontFamily.prose, fontSize: big ? 18 : 15 },
        ]}
      />
    </View>
  );
}

/** Four segments, mint up to and including the current step. */
export function Tracker({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <View style={styles.tracker} accessibilityLabel={`Step ${step} of 4`}>
      <View style={styles.trackerBars}>
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={[styles.trackerBar, { backgroundColor: n <= step ? SiftColors.mint : SiftColors.track }]} />
        ))}
      </View>
      <Label>{`STEP ${step} OF 4`}</Label>
    </View>
  );
}

/** A 1 to 3 px bar. Price position, confidence or progress, never with a number beside it. */
export function Meter({
  value,
  color = SiftColors.mint,
  width,
  height = 2,
}: {
  value: number;
  color?: string;
  width?: number;
  height?: number;
}) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={[styles.meter, { height }, width ? { width } : { flex: 1 }]}>
      <View style={{ width: pct, height, backgroundColor: color }} />
    </View>
  );
}

/**
 * Outlined uppercase action, ember for a fix, mint for good news. Without
 * onPress it is only a mark, for rows and banners that own the press already.
 */
export function Tag({ label, color = SiftColors.textDim, onPress }: { label: string; color?: string; onPress?: () => void }) {
  if (!onPress) {
    return (
      <View style={[styles.tag, { borderColor: color }]}>
        <Text style={[SiftType.labelBold, styles.tagLabel, { color }]}>{label}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tag, { borderColor: color }]}>
      <Text style={[SiftType.labelBold, styles.tagLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** 30 px square toggle. Mint with a tick when on; outlined, with a plus or nothing, when off. */
export function Check({ on, offGlyph = 'none', size = 30 }: { on: boolean; offGlyph?: 'plus' | 'none'; size?: number }) {
  return (
    <View style={[styles.check, { width: size, height: size }, on ? styles.checkOn : styles.checkOff]}>
      {on ? (
        <Icon name="tick" size={12} color={SiftColors.onAccent} />
      ) : offGlyph === 'plus' ? (
        <Icon name="plus" size={11} color={SiftColors.textDim} />
      ) : null}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  /** Mono for domains, prose for names. */
  prose?: boolean;
  titleColor?: string;
  /** Uppercase mono line under the title, for times and counts. */
  meta?: string;
  dot?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  accessibilityLabel?: string;
}

/** The list primitive: title above subtitle on the left, anything on the right, hairline below. */
export function Row({ title, subtitle, subtitleColor, prose, titleColor = SiftColors.text, meta, dot, right, onPress, last, accessibilityLabel }: RowProps) {
  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      {dot && <Dot color={dot} />}
      <View style={styles.rowText}>
        <Text
          style={[prose ? SiftType.body : styles.rowDomain, { color: titleColor }]}
          numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[SiftType.small, { color: subtitleColor ?? SiftColors.textMute }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Label>{meta}</Label> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </Pressable>
  );
}

/** Ember-bordered summary of what needs the user, with its action trailing. */
export function Banner({ text, onPress, tag }: { text: string; onPress?: () => void; tag?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={text} style={styles.banner}>
      <Icon name="alert" size={12} color={SiftColors.ember} />
      <Text style={[SiftType.body, styles.bannerText]} numberOfLines={1}>
        {text}
      </Text>
      {tag ? <Tag label={tag} color={SiftColors.ember} /> : <Icon name="arrow" size={11} color={SiftColors.ember} />}
    </Pressable>
  );
}

interface HeadingProps {
  title: string;
  sub?: string;
  step?: 1 | 2 | 3 | 4;
  /** Small ember line above the title, for failure screens. */
  alert?: string;
  landscape?: boolean;
  /** Landscape sets the sub as a mono label (a product name). Sentences opt out. */
  proseSub?: boolean;
}

/**
 * Screen title block. Portrait puts the tracker on top, as in the frames;
 * landscape sets the title first and the tracker beneath it in the side column.
 */
export function Heading({ title, sub, step, alert, landscape, proseSub }: HeadingProps) {
  const alertLine = alert ? (
    <View style={styles.alertLine}>
      <Icon name="alert" size={11} color={SiftColors.ember} />
      <Text style={[SiftType.labelBold, { color: SiftColors.ember }]}>{alert}</Text>
    </View>
  ) : null;

  if (landscape) {
    return (
      <View style={styles.heading}>
        {alertLine}
        {/* The side column is 186 px of text: a phrase steps down a size so it does not stack four deep. */}
        <Text style={[styles.title, title.length > 12 && styles.titleLong]} accessibilityRole="header">
          {title}
        </Text>
        {sub ? (
          <Text style={proseSub ? [SiftType.small, { color: SiftColors.textDim }] : [SiftType.label, { color: SiftColors.textMute }]}>
            {sub}
          </Text>
        ) : null}
        {step && <View style={styles.headingTracker}><Tracker step={step} /></View>}
      </View>
    );
  }

  return (
    <View style={styles.heading}>
      {step && <View style={styles.headingTrackerTop}><Tracker step={step} /></View>}
      {alertLine}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {sub ? <Text style={[SiftType.body, { color: SiftColors.textDim }]}>{sub}</Text> : null}
    </View>
  );
}

/** A two-column stat line: uppercase label left, mono value right. */
export function Stat({ label, value, color = SiftColors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Label>{label}</Label>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: { height: 1, backgroundColor: SiftColors.hairline },
  dot: { width: 6, height: 6, borderRadius: 3 },

  button: {
    minHeight: 44,
    paddingHorizontal: SiftSpacing.s4,
    borderRadius: SiftRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SiftSpacing.s2,
  },
  buttonPrimary: { backgroundColor: SiftColors.acid },
  buttonGhost: { backgroundColor: SiftColors.surface, borderWidth: 1, borderColor: SiftColors.hairline },
  buttonDisabled: { backgroundColor: SiftColors.surfaceHi },
  buttonLabel: { fontFamily: SiftFontFamily.monoBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },

  inputBox: {
    backgroundColor: SiftColors.surfaceHi,
    borderWidth: 1,
    borderColor: SiftColors.hairline,
    borderRadius: SiftRadius,
    paddingHorizontal: SiftSpacing.s4,
    paddingVertical: SiftSpacing.s3,
    gap: SiftSpacing.s2,
  },
  inputFocused: { borderColor: SiftColors.mint },
  input: {
    color: SiftColors.text,
    padding: 0,
    minHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  tracker: { gap: SiftSpacing.s3 },
  trackerBars: { flexDirection: 'row', gap: 6 },
  trackerBar: { flex: 1, height: 3, borderRadius: 1 },

  meter: { backgroundColor: SiftColors.track, borderRadius: 1, overflow: 'hidden' },

  tag: {
    borderWidth: 1,
    borderRadius: SiftRadius,
    paddingHorizontal: SiftSpacing.s2,
    height: 22,
    justifyContent: 'center',
  },
  tagLabel: { fontSize: 9.5 },

  check: { borderRadius: SiftRadius, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: SiftColors.mint },
  checkOff: { borderWidth: 1, borderColor: SiftColors.textMute },

  row: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s3, minHeight: 56, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: SiftColors.hairline },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowDomain: { fontFamily: SiftFontFamily.mono, fontSize: 14, lineHeight: 19 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SiftSpacing.s3,
    borderWidth: 1,
    borderColor: SiftColors.ember,
    borderRadius: SiftRadius,
    backgroundColor: SiftColors.surface,
    paddingHorizontal: SiftSpacing.s4,
    minHeight: 44,
  },
  bannerText: { flex: 1, color: SiftColors.text, fontSize: 13 },

  heading: { gap: SiftSpacing.s2 },
  headingTrackerTop: { marginBottom: SiftSpacing.s5 },
  headingTracker: { marginTop: SiftSpacing.s4 },
  alertLine: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s2 },
  title: { ...SiftType.title, color: SiftColors.text },
  titleLong: { fontSize: 30, lineHeight: 28 },

  stat: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: SiftSpacing.s2 },
  statValue: { fontFamily: SiftFontFamily.monoBold, fontSize: 14 },
});
