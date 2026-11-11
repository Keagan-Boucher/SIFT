import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListingSheet } from '@/components/sift/ListingSheet';
import { Screen } from '@/components/ui/Screen';
import { Banner, Heading, Meter, Row, Stat, Tag } from '@/components/ui/kit';
import { SiftColors, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { fmtPrice } from '@/lib/format-price';
import { ERROR_COPY } from '@/lib/map-to-view';
import type { SourceView, TileView } from '@/types/view';

/** A source that needs the user: ember dot, the reason, and its fix as an outlined tag. */
export function FailedRow({ source, onFix, last }: { source: SourceView; onFix: (source: SourceView) => void; last?: boolean }) {
  const copy = source.kind ? ERROR_COPY[source.kind] : null;
  return (
    <Row
      dot={SiftColors.ember}
      title={source.domain}
      titleColor={SiftColors.textDim}
      subtitle={copy?.reason ?? 'No price found'}
      subtitleColor={copy ? SiftColors.ember : SiftColors.textMute}
      last={last}
      right={copy ? <Tag label={copy.fix} color={SiftColors.ember} onPress={() => onFix(source)} /> : null}
    />
  );
}

/** 04 and 08 Scanning. Rows fill in one at a time from the listener; failures are row state, never a modal. */
export function LiveView({ flow }: { flow: SiftFlow }) {
  const { query, session, needs, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const { sources, tiles, running } = session;
  const [detail, setDetail] = useState<TileView | null>(null);

  const priced = tiles.filter((tile) => !tile.issue);
  const lowest = priced.length > 0 ? Math.min(...priced.map((tile) => tile.value)) : null;
  const firstWeak = tiles.find((tile) => tile.issue);
  const needCount = needs.length;

  const rows = sources.map((source, index) => {
    const last = index === sources.length - 1;
    const tile = tiles.find((t) => t.domain === source.domain);
    const need = needs.find((n) => n.domain === source.domain);
    if (need) return <FailedRow key={source.domain} source={need} onFix={actions.fix} last={last} />;
    if (tile) {
      return (
        <Row
          key={source.domain}
          title={source.domain}
          subtitle={tile.title}
          last={last}
          onPress={() => setDetail(tile)}
          accessibilityLabel={`${source.domain}, ${tile.price}, show listing`}
          right={<Text style={[styles.price, { color: tile.lowest ? SiftColors.mint : SiftColors.text }]}>{tile.price}</Text>}
        />
      );
    }
    // Unresolved rows keep the two-line shape so the column does not go ragged.
    const working = source.status === 'RESOLVING' || source.status === 'RESOLVED';
    return (
      <Row
        key={source.domain}
        title={source.domain}
        titleColor={SiftColors.textMute}
        subtitle={!running && session.complete ? 'No price found' : working ? 'Looking for the listing' : 'Not started'}
        last={last}
        right={<Meter value={source.status === 'RESOLVED' ? 0.9 : working ? 0.6 : 0.05} width={90} />}
      />
    );
  });

  const stats = (
    <View>
      <Stat label="REPORTED" value={`${tiles.length} / ${sources.length}`} />
      {needCount > 0 ? (
        <Stat label="NEEDS YOU" value={String(needCount)} color={SiftColors.ember} />
      ) : lowest !== null ? (
        <Stat label="LOWEST" value={fmtPrice(lowest)} color={SiftColors.mint} />
      ) : null}
    </View>
  );

  return (
    <Screen
      back={landscape ? undefined : { label: 'Searches', onPress: () => actions.go('home') }}
      icons={topIcons}
      aside={<Heading title="Scanning" sub={query} step={2} landscape={landscape} />}
      asideFooter={stats}
      ghost={{ label: 'Leave', onPress: () => actions.go('home') }}
      primary={
        firstWeak
          ? { label: 'Confirm match', arrow: true, onPress: () => actions.openConfirm(firstWeak.domain) }
          : {
              label: `Compare ${priced.length} ${priced.length === 1 ? 'result' : 'results'}`,
              arrow: true,
              onPress: () => actions.go('compare'),
              disabled: priced.length === 0,
            }
      }>
      {session.error && <Text style={[SiftType.small, { color: SiftColors.ember }]}>{session.error}</Text>}
      {needCount > 0 && (
        <Banner
          text={`${needCount} ${needCount === 1 ? 'source needs' : 'sources need'} you before the compare`}
          onPress={() => actions.fix(needs[0])}
        />
      )}
      <View>{rows}</View>
      <ListingSheet tile={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { ...SiftType.price },
});
