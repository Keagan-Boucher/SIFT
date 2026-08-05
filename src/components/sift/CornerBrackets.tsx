import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { SiftColors } from '@/constants/sift-theme';

interface CornerBracketsProps {
  active?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CornerBrackets({ active = true, children, style }: CornerBracketsProps) {
  return (
    <View style={[styles.wrap, style]}>
      {children}
      {active && (
        <>
          <View style={[styles.bracket, styles.tl]} />
          <View style={[styles.bracket, styles.tr]} />
          <View style={[styles.bracket, styles.bl]} />
          <View style={[styles.bracket, styles.br]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  bracket: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: SiftColors.bone,
  },
  tl: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
});
