import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { SiftColors, SiftRadius } from '@/constants/sift-theme';

/**
 * Every text field in SIFT. Carries the two things a bare TextInput gets
 * wrong here: Android hands a focused input to a full screen editor when
 * there is little room around it, which in landscape is always, and an
 * unfocused-looking field gives the user nothing to say where their typing
 * is going. Fields that draw their own border (the query box) can switch the
 * base border off and keep the acid focus colour.
 */
export function Input({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      disableFullscreenUI
      placeholderTextColor={SiftColors.boneDim}
      {...rest}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[styles.base, style, focused && styles.focused]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: SiftColors.carbon,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    borderRadius: SiftRadius,
    color: SiftColors.bone,
  },
  focused: { borderColor: SiftColors.acid },
});
