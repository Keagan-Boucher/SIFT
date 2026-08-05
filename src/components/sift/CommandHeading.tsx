import type { StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native';

import { SiftSigilColor, SiftType } from '@/constants/sift-theme';

export type Sigil = '//' | '>' | '!' | '?';

interface CommandHeadingProps {
  sigil?: Sigil;
  text: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

export function CommandHeading({ sigil = '//', text, suffix, style }: CommandHeadingProps) {
  const color = SiftSigilColor[sigil] ?? SiftSigilColor['//'];
  return (
    <Text style={[{ ...SiftType.label, textTransform: 'uppercase', color }, style]}>
      {sigil}
      {text}
      {suffix ? `_[${suffix}]` : ''}
    </Text>
  );
}
