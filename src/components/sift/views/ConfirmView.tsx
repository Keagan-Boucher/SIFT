import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { ConfirmMatchCandidate } from '@/components/sift/ConfirmMatchCandidate';
import { CornerBrackets } from '@/components/sift/CornerBrackets';
import { InsightCard } from '@/components/sift/InsightCard';
import { SiftSpacing, SiftType, SiftColors } from '@/constants/sift-theme';
import { CANDIDATES } from '@/constants/sift-mock-data';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface ConfirmViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function ConfirmView({ flow, orientation }: ConfirmViewProps) {
  const { state, candidateSelectedLabel, actions } = flow;

  const list = (
    <View style={styles.list}>
      <CommandHeading sigil=">" text="CONFIRM" suffix="2_LOW_CONFIDENCE" />
      {CANDIDATES.map((c, i) => (
        <Pressable key={c.title} onPress={() => actions.chooseCandidate(i)} style={styles.candidate}>
          <CornerBrackets active={state.chosen === i}>
            <ConfirmMatchCandidate title={c.title} price={c.price} confidence={c.confidence} />
          </CornerBrackets>
        </Pressable>
      ))}
      {orientation === 'portrait' && <Text style={styles.selectedLabel}>SELECTED: {candidateSelectedLabel}</Text>}
    </View>
  );

  const sidebar = (
    <View style={styles.sidebar}>
      <InsightCard heading="WHY_YOU_PICK">
        evetech.co.za returned two listings for this query and neither scored above 60%. The one you pick is
        the one compared, and it teaches the ranking for next time.
      </InsightCard>
      {orientation === 'landscape' && <Text style={styles.selectedLabel}>SELECTED: {candidateSelectedLabel}</Text>}
    </View>
  );

  if (orientation === 'landscape') {
    return (
      <View style={styles.row}>
        {list}
        {sidebar}
      </View>
    );
  }

  return (
    <View style={styles.col}>
      {list}
      <InsightCard heading="WHY_YOU_PICK">
        evetech.co.za returned two listings for this query and neither scored above 60%. The one you pick is
        the one compared.
      </InsightCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SiftSpacing.space4, padding: SiftSpacing.space4 },
  col: { gap: SiftSpacing.space3, padding: SiftSpacing.space4 },
  list: { flex: 1, minWidth: 280, gap: SiftSpacing.space2 },
  candidate: { maxWidth: 560 },
  sidebar: { flexBasis: 240, flexGrow: 0, flexShrink: 1, minWidth: 200, maxWidth: 280, gap: SiftSpacing.space3 },
  selectedLabel: { ...SiftType.annot, color: SiftColors.boneDim },
});
