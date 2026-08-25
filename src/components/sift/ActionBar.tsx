import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Button } from './Button';

interface ActionBarProps {
  secondaryLabel: string;
  onSecondary: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  alertCount: number;
  hasAlerts: boolean;
  onToggleAlerts: () => void;
  linksCount: number;
  hasLinks: boolean;
  onToggleLinks: () => void;
  statusLine: string;
  style?: StyleProp<ViewStyle>;
}

export function ActionBar({
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  alertCount,
  hasAlerts,
  onToggleAlerts,
  linksCount,
  hasLinks,
  onToggleLinks,
  statusLine,
  style,
}: ActionBarProps) {
  return (
    <View style={[styles.bar, style]}>
      <View style={styles.leftGroup}>
        <Button variant="ghost" onPress={onSecondary} style={styles.secondaryButton}>
          {secondaryLabel}
        </Button>
        <Button variant="primary" onPress={onPrimary} disabled={primaryDisabled} style={styles.primaryButton}>
          {primaryLabel}
        </Button>
      </View>
      <View style={styles.rightGroup}>
        <Pressable onPress={onToggleLinks} style={styles.alertButton}>
          <Text style={styles.alertLabel}>
            LINKS <Text style={{ color: hasLinks ? SiftColors.acid : SiftColors.boneDim }}>[{linksCount}]</Text>
          </Text>
        </Pressable>
        <Pressable onPress={onToggleAlerts} style={styles.alertButton}>
          <Text style={styles.alertLabel}>
            ALERT LOG <Text style={{ color: hasAlerts ? SiftColors.ember : SiftColors.boneDim }}>[{alertCount}]</Text>
          </Text>
        </Pressable>
        <Text style={styles.status}>{statusLine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    backgroundColor: SiftColors.carbon,
    borderTopWidth: 1,
    borderTopColor: SiftColors.graphite,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SiftSpacing.space4,
    paddingVertical: SiftSpacing.space2,
    gap: SiftSpacing.space3,
  },
  leftGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SiftSpacing.space3 },
  rightGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SiftSpacing.space3 },
  secondaryButton: { minWidth: 96, height: 40 },
  primaryButton: { minWidth: 130, height: 40 },
  alertButton: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  alertLabel: { ...SiftType.label, color: SiftColors.bone },
  status: { ...SiftType.label, color: SiftColors.mint },
});
