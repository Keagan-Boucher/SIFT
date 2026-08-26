import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { SiftMark } from './SiftMark';

interface RailProps {
  screenName: string;
  sourceCount?: number;
  /** Opens the account panel, from the button at the foot of the rail. */
  onPressSession?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Head and shoulders, the one shape everyone already reads as "your account". */
function AccountGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={5} r={2.75} stroke={SiftColors.bone} strokeWidth={1.4} />
      <Path d="M2.5 14c0-2.9 2.46-5 5.5-5s5.5 2.1 5.5 5" stroke={SiftColors.bone} strokeWidth={1.4} strokeLinecap="square" />
    </Svg>
  );
}

export function Rail({ screenName, sourceCount = 0, onPressSession, style }: RailProps) {
  return (
    <View style={[styles.rail, style]}>
      <SiftMark width={22} />

      <View style={styles.screenNameWrap}>
        <Text style={styles.screenName} numberOfLines={1}>
          {screenName}
        </Text>
      </View>

      <View style={styles.sources}>
        {Array.from({ length: sourceCount }).map((_, i) => (
          <View key={i} style={styles.sourceTick} />
        ))}
      </View>

      {onPressSession ? (
        <Pressable
          style={styles.accountButton}
          onPress={onPressSession}
          accessibilityRole="button"
          accessibilityLabel="Manage your account">
          <AccountGlyph />
        </Pressable>
      ) : (
        // The auth screens borrow the rail before there is an account to open.
        <View style={styles.accountButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: SiftSpacing.railWidth,
    minHeight: 300,
    backgroundColor: SiftColors.carbon,
    borderRightWidth: 1,
    borderRightColor: SiftColors.graphite,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SiftSpacing.space4,
  },
  // The title is rotated, so its box is 20px wide and its length runs down the
  // rail. Keeping it centred and away from the mark is vertical margin, not padding.
  screenNameWrap: { width: 20, alignItems: 'center', justifyContent: 'center', marginVertical: SiftSpacing.space4 },
  screenName: {
    ...SiftType.displayM,
    color: SiftColors.bone,
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
    width: 150,
    textAlign: 'center',
  },
  sources: { gap: 4, alignItems: 'center' },
  sourceTick: { width: 20, height: 1, backgroundColor: SiftColors.graphite },
  accountButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    backgroundColor: SiftColors.slate,
  },
});
