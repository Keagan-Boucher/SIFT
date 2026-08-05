import { StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { InsightCard } from '@/components/sift/InsightCard';
import { TheSpread } from '@/components/sift/TheSpread';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface DashboardViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function DashboardView({ flow, orientation }: DashboardViewProps) {
  const { resultSuffix, spreadPoints, spreadLabel, ladder, historyBars } = flow;

  const history = (
    <View style={styles.historySection}>
      <CommandHeading sigil="//" text="LAST_30_DAYS" />
      <View style={styles.historyBars}>
        {historyBars.map((bar, i) => (
          <View
            key={i}
            style={[styles.historyBar, { height: bar.heightPx, backgroundColor: bar.isToday ? SiftColors.mint : SiftColors.graphite }]}
          />
        ))}
      </View>
      <Text style={styles.historySummary}>30-DAY LOW R2 780 · MEDIAN R3 150 · TODAY R2 899, FALLING</Text>
    </View>
  );

  const readInsight = (
    <InsightCard heading="HOW_TO_READ_THIS">
      A wide spread means the retailers disagree, usually on stock. Buy near the low end of the band, not at
      the single lowest number, because the lowest is the one most likely to be wrong.
    </InsightCard>
  );

  if (orientation === 'landscape') {
    return (
      <View style={styles.row}>
        <View style={styles.spreadCol}>
          <CommandHeading sigil="//" text="SPREAD" suffix={resultSuffix} />
          <TheSpread points={spreadPoints} spreadLabel={spreadLabel} />
        </View>
        <View style={styles.sidebar}>
          {history}
          {readInsight}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.col}>
      <CommandHeading sigil="//" text="SPREAD" suffix={resultSuffix} />
      <View>
        {ladder.map((row) => (
          <View key={row.label} style={styles.ladderRow}>
            <View style={styles.ladderHeader}>
              <Text style={styles.ladderLabel}>{row.label}</Text>
              <Text style={styles.ladderPrice}>{row.price}</Text>
            </View>
            <View style={[styles.ladderBar, { width: `${row.widthPct}%`, backgroundColor: row.color }]} />
          </View>
        ))}
      </View>
      <Text style={styles.spreadLabelText}>{spreadLabel}</Text>
      {history}
      {readInsight}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SiftSpacing.space4, padding: SiftSpacing.space4 },
  col: { gap: SiftSpacing.space4, padding: SiftSpacing.space4 },
  spreadCol: { flex: 1, minWidth: 280, gap: SiftSpacing.space2 },
  sidebar: { flexBasis: 264, flexGrow: 0, flexShrink: 1, minWidth: 220, maxWidth: 320, gap: SiftSpacing.space3 },
  ladderRow: { gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SiftColors.graphite },
  ladderHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  ladderLabel: { ...SiftType.label, color: SiftColors.boneDim },
  ladderPrice: { ...SiftType.priceM, color: SiftColors.bone },
  ladderBar: { height: 6 },
  spreadLabelText: { ...SiftType.annot, color: SiftColors.boneDim },
  historySection: { gap: SiftSpacing.space2 },
  historyBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 64, borderBottomWidth: 1, borderBottomColor: SiftColors.graphite },
  historyBar: { flex: 1 },
  historySummary: { ...SiftType.annot, color: SiftColors.boneDim },
});
