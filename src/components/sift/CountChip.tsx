import type { StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native';

import { SiftColors, SiftType } from '@/constants/sift-theme';

interface CountChipProps {
  count: number;
  style?: StyleProp<TextStyle>;
}

export function CountChip({ count, style }: CountChipProps) {
  return (
    <Text style={[{ ...SiftType.annot, color: SiftColors.boneDim, textTransform: 'uppercase' }, style]}>
      ×{count}
    </Text>
  );
}
