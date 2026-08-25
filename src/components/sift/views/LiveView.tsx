import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { CornerBrackets } from '@/components/sift/CornerBrackets';
import { InsightCard } from '@/components/sift/InsightCard';
import { PlusGrid } from '@/components/sift/PlusGrid';
import { ProgressBar } from '@/components/sift/ProgressBar';
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
  const { state, resolved, running, complete, sources, tiles, liveInsight } = flow;
  const heading = running ? 'SEARCH_RUNNING' : 'SEARCH_COMPLETE';
  const suffix = `${resolved}/${sources.length}`;
  const slotCount = Math.max(0, 4 - tiles.length);

  // What the pipeline is doing right now, so a slow search reads as busy
  // rather than hung. Locating still means finding the right page; once every
  // source has one, the wait is for prices to come off it.
  const locating = sources.filter((s) => s.status === 'PENDING').length;
  const activity = !running
    ? ''
    : locating > 0
      ? `LOCATING PRODUCT PAGES · ${sources.length - locating}/${sources.length} FOUND`
      : `PULLING PRICES OFF THE PAGE · ${resolved}/${sources.length} DONE`;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <CommandHeading sigil="//" text={heading} suffix={suffix} />
        <Text style={styles.listenerNote}>FIRESTORE LISTENER · NO MANUAL REFRESH</Text>
      </View>

      {running && (
        <ProgressBar value={sources.length > 0 ? resolved / sources.length : 0} label={activity} style={styles.progress} />
      )}

      <View style={styles.tileRow}>
        {running && <ScanSweep />}
        {tiles.map((tile, i) => (
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

      {complete && (
        <InsightCard heading="WHY_THIS_PRICE" style={styles.insight}>
          {liveInsight}
        </InsightCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: SiftSpacing.space4, gap: SiftSpacing.space3 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SiftSpacing.space4 },
  listenerNote: { ...SiftType.annot, color: SiftColors.boneDim },
  progress: { maxWidth: 420 },
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
