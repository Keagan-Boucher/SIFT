import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';
import { DotMatrix } from './DotMatrix';
import { PlusGrid } from './PlusGrid';

interface EmptyStateProps {
  heading: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ heading, children, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <DotMatrix density="lo" />
      <PlusGrid cell={32} style={{ opacity: 0.5 }} />
      <View style={styles.card}>
        <CommandHeading sigil=">" text={heading} />
        <Text style={styles.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', padding: SiftSpacing.space6, minHeight: 160 },
  card: {
    alignSelf: 'flex-start',
    gap: SiftSpacing.space3,
    backgroundColor: SiftColors.carbon,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    padding: SiftSpacing.space4,
    maxWidth: 420,
  },
  body: { ...SiftType.body, color: SiftColors.boneDim },
});
