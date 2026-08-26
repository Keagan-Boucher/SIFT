import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { SiftColors, SiftFontFamily, SiftRadius, SiftType } from '@/constants/sift-theme';

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
    ...SiftType.body,
    fontFamily: SiftFontFamily.system,
    backgroundColor: SiftColors.carbon,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    borderRadius: SiftRadius,
    color: SiftColors.bone,
    // Android reserves extra room above and below the line for ascenders and
    // descenders, and leaves a single line unaligned in a fixed-height field.
    // The leftover slack is draggable, so the text scrolls inside a box that
    // is only ever one line tall. These two settle the line in the middle and
    // leave nothing to scroll.
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Android's EditText keeps its own minimum content height. Forcing a field
    // shorter than that leaves content taller than its box, and the text then
    // drags up and down inside a single-line field. This floor keeps every box
    // at least as tall as its content, and matches the 44px minimum touch
    // target besides. Yoga lets minHeight win over a smaller height.
    minHeight: 44,
  },
  focused: { borderColor: SiftColors.acid },
});
