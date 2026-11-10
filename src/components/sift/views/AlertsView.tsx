import { Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Heading, Row, Tag } from '@/components/ui/kit';
import { SiftColors, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { relativeStamp } from '@/lib/map-to-view';
import type { AlertView } from '@/types/view';

const FIX_LABEL: Record<AlertView['kind'], string> = {
  'no-results': 'FIX',
  'weak-match': 'FIX',
  blocked: 'RETRY',
  timeout: 'RETRY',
  drop: 'VIEW',
};

/** 09 Alerts. One inbox: errors in ember, price drops in mint. Read items lose the dot and the tag. */
export function AlertsView({ flow }: { flow: SiftFlow }) {
  const { session, unread, inProgress, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const unreadIds = new Set(unread.map((alert) => alert.id));
  const ordered = [...unread, ...session.alerts.filter((alert) => !unreadIds.has(alert.id))];

  return (
    <Screen
      back={{ label: 'Searches', onPress: () => actions.go('home') }}
      icons={topIcons}
      aside={<Heading title="Alerts" landscape={landscape} />}
      primary={
        inProgress
          ? { label: 'Resume scan', onPress: () => actions.openSearch(inProgress) }
          : { label: 'New search', onPress: actions.newSearch }
      }>
      {ordered.length === 0 ? (
        <Text style={[SiftType.body, { color: SiftColors.textMute }]}>Nothing needs you.</Text>
      ) : (
        <View>
          {ordered.map((alert, index) => {
            const fresh = unreadIds.has(alert.id);
            const color = alert.kind === 'drop' ? SiftColors.mint : SiftColors.ember;
            return (
              <Row
                key={alert.id}
                prose
                title={alert.message}
                titleColor={fresh ? SiftColors.text : SiftColors.textMute}
                meta={relativeStamp(alert.at) ?? undefined}
                dot={fresh ? color : undefined}
                onPress={() => actions.openAlert(alert)}
                last={index === ordered.length - 1}
                right={fresh ? <Tag label={FIX_LABEL[alert.kind]} color={color} /> : null}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
