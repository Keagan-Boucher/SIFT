import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { SiftMark } from './SiftMark';

interface RailProps {
  screenName: string;
  connection?: 'IDLE' | 'LIVE';
  sourceCount?: number;
  /** Opens the account panel. The session code is the identity affordance. */
  onPressSession?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Rail({ screenName, connection = 'IDLE', sourceCount = 0, onPressSession, style }: RailProps) {
  return (
    <View style={[styles.rail, style]}>
      <SiftMark width={22} />

      <View style={styles.screenNameWrap}>
        <Text style={styles.screenName} numberOfLines={1}>
          {screenName}
        </Text>
      </View>

      <View
        style={[
          styles.connection,
          { backgroundColor: connection === 'LIVE' ? SiftColors.mint : 'transparent' },
        ]}>
        <Text
          style={[
            styles.connectionText,
            { color: connection === 'LIVE' ? SiftColors.void : SiftColors.boneDim },
          ]}>
          {connection}
        </Text>
      </View>

      <View style={styles.sources}>
        {Array.from({ length: sourceCount }).map((_, i) => (
          <View key={i} style={styles.sourceTick} />
        ))}
      </View>

      <Pressable style={styles.sessionWrap} onPress={onPressSession} accessibilityLabel="Account">
        <Text style={styles.session}>ACCT</Text>
      </Pressable>
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
  screenNameWrap: { width: 20, alignItems: 'center', justifyContent: 'center' },
  screenName: {
    ...SiftType.displayM,
    color: SiftColors.bone,
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
    width: 160,
    textAlign: 'center',
  },
  connection: { paddingVertical: 6, paddingHorizontal: 4 },
  connectionText: {
    ...SiftType.label,
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
  },
  sources: { gap: 4, alignItems: 'center' },
  sourceTick: { width: 20, height: 1, backgroundColor: SiftColors.graphite },
  sessionWrap: { width: 12, alignItems: 'center' },
  session: {
    ...SiftType.annot,
    color: SiftColors.boneDim,
    transform: [{ rotate: '-90deg' }],
  },
});
