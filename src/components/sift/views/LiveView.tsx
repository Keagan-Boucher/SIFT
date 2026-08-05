import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { CornerBrackets } from '@/components/sift/CornerBrackets';
import { InsightCard } from '@/components/sift/InsightCard';
import { PlusGrid } from '@/components/sift/PlusGrid';
import { ResultTile } from '@/components/sift/ResultTile';
import { ScanSweep } from '@/components/sift/ScanSweep';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface LiveViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function LiveView({ flow }: LiveViewProps) {
  const { state, resolved } = flow;
  const heading = state.running ? 'SEARCH_RUNNING' : 'SEARCH_COMPLETE';
  const suffix = `${resolved}/${state.sources.length}`;
  const slotCount = Math.max(0, 4 - state.tiles.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <CommandHeading sigil="//" text={heading} suffix={suffix} />
        <Text style={styles.listenerNote}>FIRESTORE LISTENER · NO MANUAL REFRESH</Text>
      </View>

      <View style={styles.tileRow}>
        {state.running && <ScanSweep />}
        {state.tiles.map((tile, i) => (
          <CornerBrackets key={tile.retailer} active={state.selected === i}>
            <Pressable onPress={() => flow.actions.selectTile(i)} style={styles.tileCol}>
              <ResultTile tier={tile.tier} confidence={tile.confidence} price={tile.price} retailer={tile.retailer} count={tile.count} lowest={tile.lowest} />
              <View style={styles.tileFooter}>
                <Text style={styles.tileDomain} numberOfLines={1}>
                  {tile.domain}
                </Text>
                {tile.issue && <Text style={styles.tileIssue}>!REVIEW</Text>}
              </View>
            </Pressable>
          </CornerBrackets>
        ))}
        {Array.from({ length: slotCount }).map((_, i) => (
          <View key={i} style={styles.slotCol}>
            <View style={styles.slot}>
              <PlusGrid cell={20} />
            </View>
            <Text style={styles.slotLabel}>AWAITING</Text>
          </View>
        ))}
      </View>

      {state.complete && (
        <InsightCard heading="WHY_THIS_PRICE" style={styles.insight}>
          R2 899 is the lowest of 4 sources, 8% below their median of R3 195.
        </InsightCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: SiftSpacing.space4, gap: SiftSpacing.space3 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SiftSpacing.space4 },
  listenerNote: { ...SiftType.annot, color: SiftColors.boneDim },
  tileRow: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', gap: SiftSpacing.space3 },
  tileCol: { gap: 5 },
  tileFooter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, width: 160 },
  tileDomain: { ...SiftType.annot, color: SiftColors.bone, flexShrink: 1 },
  tileIssue: { ...SiftType.annot, color: SiftColors.ember },
  slotCol: { gap: 5 },
  slot: { position: 'relative', width: 160, height: 136, borderWidth: 1, borderColor: SiftColors.graphite },
  slotLabel: { ...SiftType.annot, color: SiftColors.boneDim, width: 160 },
  insight: { maxWidth: 420, alignSelf: 'flex-start' },
});
