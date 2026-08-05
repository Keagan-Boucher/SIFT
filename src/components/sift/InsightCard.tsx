import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';

interface InsightCardProps {
  heading?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InsightCard({ heading = 'WHY_THIS_PRICE', children, style }: InsightCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <CommandHeading sigil="?" text={heading} style={{ color: SiftColors.void }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyText}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: SiftColors.paper },
  header: {
    height: SiftSpacing.stripHeight,
    backgroundColor: SiftColors.current,
    justifyContent: 'center',
    paddingHorizontal: SiftSpacing.space2,
  },
  body: { padding: SiftSpacing.space3 },
  bodyText: { ...SiftType.body, color: SiftColors.onLight },
});
