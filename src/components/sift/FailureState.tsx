import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';

interface FailureStateProps {
  heading: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FailureState({ heading, children, style }: FailureStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <CommandHeading sigil="!" text={heading} />
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: SiftSpacing.space5,
    backgroundColor: SiftColors.carbon,
    borderLeftWidth: 3,
    borderLeftColor: SiftColors.ember,
    gap: SiftSpacing.space3,
  },
  body: { ...SiftType.body, color: SiftColors.bone, maxWidth: 460 },
});
