import { Linking, StyleSheet, Text, View } from 'react-native';

import { FailedRow } from '@/components/sift/views/LiveView';
import { Screen } from '@/components/ui/Screen';
import { Banner, Heading, Label, Meter, Row } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { fmtPrice } from '@/lib/format-price';
import { countWord } from '@/lib/map-to-view';

/** Brand names are usually the first word, and the part retailers list most inconsistently. */
function shorterQuery(query: string): string | null {
  const words = query.trim().split(/\s+/);
  return words.length >= 3 ? words.slice(1).join(' ') : null;
}

/**
 * 05 Compare, 10 Compare partial and 11 No results. The meter is the only
 * encoding of where a price sits in the band: no percentages, no badges.
 */
export function CompareView({ flow }: { flow: SiftFlow }) {
  const { query, session, needs, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const back = { label: 'Scan', onPress: () => actions.go('live') };

  const priced = session.tiles.filter((tile) => !tile.issue).sort((a, b) => a.value - b.value);
  const total = session.sources.length;

  if (priced.length === 0) {
    // Sources still working or with nothing found still belong in the list, so the whole picture shows.
    const silent = session.sources.filter((source) => !needs.some((n) => n.domain === source.domain));
    const failed = [...needs, ...silent];
    const shorter = shorterQuery(query);
    return (
      <Screen
        back={back}
        icons={topIcons}
        aside={
          <Heading
            alert="NO PRICES"
            title="Nothing came back"
            sub={`None of the ${countWord(total).toLowerCase()} sources returned a price for “${query}”.`}
            step={4}
            landscape={landscape}
            proseSub
          />
        }
        ghost={{ label: 'Edit search', onPress: actions.editSearch }}
        primary={{ label: 'Run again', onPress: actions.retry }}>
        <View>
          {failed.map((source, index) => (
            <FailedRow key={source.domain} source={source} onFix={actions.fix} last={index === failed.length - 1} />
          ))}
        </View>
        <Text style={[SiftType.small, { color: SiftColors.textMute }]}>
          {shorter
            ? `A shorter product name usually finds more listings. Try “${shorter}”.`
            : 'A more general product name usually finds more listings.'}
        </Text>
      </Screen>
    );
  }

  const low = priced[0].value;
  const high = priced[priced.length - 1].value;
  const band = high - low;
  const spread = low > 0 ? Math.round((band / low) * 100) : 0;
  const lesson =
    needs.length > 0
      ? `${countWord(priced.length)} ${priced.length === 1 ? 'price is' : 'prices is'} a thin sample. The real low could sit under ${fmtPrice(low)}.`
      : 'Buy near the bottom of the band, not at the single lowest number.';
  const lessonText = <Text style={[SiftType.small, styles.lesson]}>{lesson}</Text>;

  return (
    <Screen
      back={back}
      icons={topIcons}
      aside={<Heading title="Compare" sub={query} step={4} landscape={landscape} />}
      asideFooter={landscape ? lessonText : undefined}
      ghost={needs.length > 0 ? { label: `Fix ${needs.length} ${needs.length === 1 ? 'source' : 'sources'}`, onPress: () => actions.fix(needs[0]) } : undefined}
      primary={{ label: 'Save to watchlist', arrow: true, onPress: actions.save }}>
      {needs.length > 0 && (
        <Banner text={`Comparing ${priced.length} of ${total} sources`} tag={`FIX ${needs.length}`} onPress={() => actions.fix(needs[0])} />
      )}

      <View style={styles.range}>
        <Text style={[styles.rangePrice, { color: SiftColors.mint }]}>{fmtPrice(low)}</Text>
        {band > 0 && (
          <>
            <Label>TO</Label>
            <Text style={[styles.rangePrice, { color: SiftColors.textDim }]}>{fmtPrice(high)}</Text>
            <View style={styles.flex} />
            <Label>{`${spread}% SPREAD`}</Label>
          </>
        )}
      </View>

      <View>
        {priced.map((tile, index) => {
          const best = tile.value === low;
          // Full for the cheapest, shrinking toward the top of the band.
          const position = band > 0 ? 1 - (tile.value - low) / band : 1;
          return (
            <Row
              key={tile.domain}
              title={tile.domain}
              subtitle={tile.title}
              onPress={() => Linking.openURL(tile.url).catch(() => {})}
              accessibilityLabel={`${tile.domain}, ${tile.price}, open listing`}
              last={index === priced.length - 1 && needs.length === 0}
              right={
                <View style={styles.right}>
                  <Meter value={Math.max(position, 0.06)} width={landscape ? 150 : 72} color={best ? SiftColors.mint : SiftColors.meterRest} />
                  <Text style={[styles.price, { color: best ? SiftColors.mint : SiftColors.text }]}>{tile.price}</Text>
                </View>
              }
            />
          );
        })}
        {needs.map((source, index) => (
          <FailedRow key={source.domain} source={source} onFix={actions.fix} last={index === needs.length - 1} />
        ))}
      </View>

      {!landscape && lessonText}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  range: { flexDirection: 'row', alignItems: 'baseline', gap: SiftSpacing.s3 },
  rangePrice: { fontFamily: SiftFontFamily.monoBold, fontSize: 20 },
  right: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s4 },
  price: { ...SiftType.price, minWidth: 84, textAlign: 'right' },
  lesson: { color: SiftColors.textDim, fontSize: 12.5, lineHeight: 18 },
});
