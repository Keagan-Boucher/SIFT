import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Heading, Label, Row } from '@/components/ui/kit';
import { SiftColors, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { fmtPrice } from '@/lib/format-price';

/** Watched searches. The scheduled recheck moves their lowest price; a drop shows in mint. */
export function SavedView({ flow }: { flow: SiftFlow }) {
  const { session, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const { saved } = session;

  return (
    <Screen
      back={{ label: 'Searches', onPress: () => actions.go('home') }}
      icons={topIcons}
      aside={<Heading title="Watchlist" landscape={landscape} />}
      primary={{ label: 'Check all now', onPress: actions.checkAllSaved, disabled: saved.length === 0 }}>
      {saved.length === 0 ? (
        <Text style={[SiftType.body, { color: SiftColors.textMute }]}>Save a comparison to watch its lowest price.</Text>
      ) : (
        <View>
          {saved.map((item, index) => (
            <Row
              key={item.id}
              prose
              title={item.name}
              meta={`${item.sources} ${item.sources === 1 ? 'SOURCE' : 'SOURCES'} · ${item.lastChecked ?? 'NOT CHECKED YET'}`}
              last={index === saved.length - 1}
              right={
                <View style={styles.right}>
                  <Text style={[styles.price, { color: item.justDropped ? SiftColors.mint : SiftColors.text }]}>{fmtPrice(item.value)}</Text>
                  {item.wasValue !== undefined && <Label>{`WAS ${fmtPrice(item.wasValue)}`}</Label>}
                </View>
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', gap: 2 },
  price: { ...SiftType.price, fontSize: 15 },
});
