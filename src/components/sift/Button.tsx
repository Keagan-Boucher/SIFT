import { useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SiftColors, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const FILL: Record<ButtonVariant, { background: string; color: string; borderColor?: string }> = {
  primary: { background: SiftColors.acid, color: SiftColors.onSignal },
  secondary: { background: SiftColors.paper, color: SiftColors.onLight },
  ghost: { background: 'transparent', color: SiftColors.bone, borderColor: SiftColors.graphite },
  destructive: { background: SiftColors.void, color: SiftColors.ember, borderColor: SiftColors.ember },
};

/** Pressed fill flips hard to bone/void — no opacity fade, per design system rule. */
const PRESSED_FILL: Record<ButtonVariant, { background: string; color: string; borderColor?: string }> = {
  primary: { background: SiftColors.bone, color: SiftColors.onSignal },
  secondary: { background: SiftColors.paperHi, color: SiftColors.onLight },
  ghost: { background: SiftColors.graphite, color: SiftColors.bone, borderColor: SiftColors.graphite },
  destructive: { background: SiftColors.ember, color: SiftColors.void, borderColor: SiftColors.ember },
};

interface ButtonProps {
  variant?: ButtonVariant;
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({ variant = 'primary', children, onPress, disabled = false, style, textStyle }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const fill = pressed ? PRESSED_FILL[variant] : FILL[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        {
          backgroundColor: fill.background,
          borderColor: fill.borderColor ?? 'transparent',
          borderWidth: fill.borderColor ? 1 : 0,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      <Text style={[styles.label, { color: fill.color }, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 40,
    minWidth: 120,
    paddingHorizontal: SiftSpacing.space4,
    borderRadius: SiftRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...SiftType.displayM,
    textTransform: 'uppercase',
  },
});
