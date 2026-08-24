import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';

interface RailProps {
  screenName: string;
  connection?: 'IDLE' | 'LIVE';
  sourceCount?: number;
  sessionCode: string;
  /** Opens the account panel. The session code is the identity affordance. */
  onPressSession?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Rail({ screenName, connection = 'IDLE', sourceCount = 0, sessionCode, onPressSession, style }: RailProps) {
  return (
    <View style={[styles.rail, style]}>
      <Svg width={22} height={18} viewBox="0 0 89 71" fill="none">
        <Path
          d="M29.8428 36.1963V71H14.8428V27.1836L29.8428 36.1963ZM51.8428 49.415V71H36.8428V40.4014L51.8428 49.415ZM73.8428 62.6338V71H58.8428V53.6211L73.8428 62.6338ZM84.6553 51.9561C88.14 54.0499 89.2676 58.5719 87.1738 62.0566C85.08 65.5414 80.558 66.669 77.0732 64.5752L73.8428 62.6338V45.458L84.6553 51.9561ZM58.8428 36.4453V53.6211L51.8428 49.415V32.2393L58.8428 36.4453ZM73.8428 45.458L58.8428 36.4453V0H73.8428V45.458ZM36.8428 23.2266V40.4014L29.8428 36.1963V19.0205L36.8428 23.2266ZM51.8428 32.2393L36.8428 23.2266V0H51.8428V32.2393ZM1.05272 10.3096C3.14665 6.82509 7.66865 5.69731 11.1533 7.79102L14.8428 10.0078V27.1836L3.5703 20.4111C0.0856476 18.3172 -1.04111 13.7943 1.05272 10.3096ZM29.8428 19.0205L14.8428 10.0078V0H29.8428V19.0205Z"
          fill={SiftColors.bone}
        />
      </Svg>

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
        <Text style={styles.session}>{sessionCode}</Text>
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
