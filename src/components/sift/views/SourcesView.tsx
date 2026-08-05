import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/sift/Button';
import { CommandHeading } from '@/components/sift/CommandHeading';
import { SourceChip } from '@/components/sift/SourceChip';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface SourcesViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function SourcesView({ flow, orientation }: SourcesViewProps) {
  const { state, sourceCountLabel, recentCount, actions } = flow;

  const sourcesBlock = (
    <View style={orientation === 'landscape' ? styles.sourcesColLandscape : styles.sourcesColPortrait}>
      <CommandHeading sigil="//" text="SOURCES" suffix={sourceCountLabel} />
      {state.sources.map((s) => (
        <SourceChip key={s.domain} domain={s.domain} status={s.status} onPress={() => actions.removeSource(s.domain)} />
      ))}
      <View style={styles.addRow}>
        <TextInput
          value={state.input}
          onChangeText={actions.setInput}
          onSubmitEditing={actions.addSourceFromInput}
          placeholder="paste retailer url"
          placeholderTextColor={SiftColors.boneDim}
          style={styles.urlInput}
        />
        <Button variant="ghost" onPress={actions.addSourceFromInput} style={styles.addButton}>
          + ADD
        </Button>
      </View>
      <Text style={styles.hint}>TAP A SOURCE TO REMOVE IT</Text>
    </View>
  );

  const queryBlock = (
    <View style={styles.queryCol}>
      <CommandHeading sigil="//" text="QUERY" suffix="R991" />
      <View style={styles.queryBox}>
        <TextInput
          value={state.query}
          onChangeText={actions.setQuery}
          placeholder="what are you looking for"
          placeholderTextColor={SiftColors.boneDim}
          style={styles.queryInput}
        />
        <Text style={styles.queryHelper}>RESOLUTION A–C · EXTRACTION T3, T4</Text>
      </View>
    </View>
  );

  const recentBlock = (
    <View style={styles.recentCol}>
      <CommandHeading sigil="//" text="RECENT" suffix={recentCount} />
      {state.recents.map((r) => (
        <Pressable key={r.name} style={styles.recentRow} onPress={() => actions.chooseRecent(r.name)}>
          <Text style={styles.recentName} numberOfLines={1}>
            {r.name}
          </Text>
          <Text style={styles.recentMeta}>{r.meta}</Text>
        </Pressable>
      ))}
      <Text style={styles.hint}>TAP A PAST SEARCH TO REUSE IT</Text>
    </View>
  );

  if (orientation === 'landscape') {
    return (
      <View style={styles.landscapeRow}>
        {sourcesBlock}
        <View style={styles.landscapeMain}>
          {queryBlock}
          {recentBlock}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portraitCol}>
      {queryBlock}
      {recentBlock}
      {sourcesBlock}
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', minHeight: 0 },
  landscapeMain: { flex: 1, minWidth: 260, padding: SiftSpacing.space4, gap: SiftSpacing.space4 },
  portraitCol: { gap: SiftSpacing.space4, padding: SiftSpacing.space4 },
  sourcesColLandscape: {
    flexBasis: 320,
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 220,
    maxWidth: 320,
    padding: SiftSpacing.space4,
    gap: SiftSpacing.space2,
    borderRightWidth: 1,
    borderRightColor: SiftColors.graphite,
  },
  sourcesColPortrait: { gap: SiftSpacing.space2 },
  queryCol: { gap: SiftSpacing.space2 },
  queryBox: { borderWidth: 1, borderColor: SiftColors.graphite },
  queryInput: {
    height: 44,
    backgroundColor: SiftColors.carbon,
    borderBottomWidth: 1,
    borderBottomColor: SiftColors.graphite,
    color: SiftColors.bone,
    fontFamily: SiftType.body.fontFamily,
    fontSize: 20,
    paddingHorizontal: 12,
  },
  queryHelper: { ...SiftType.annot, color: SiftColors.boneDim, paddingHorizontal: 12, paddingVertical: 6 },
  recentCol: { gap: SiftSpacing.space2 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    height: 26,
    paddingHorizontal: 8,
    backgroundColor: SiftColors.carbon,
    borderLeftWidth: 2,
    borderLeftColor: SiftColors.graphite,
  },
  recentName: { ...SiftType.body, fontSize: 13, color: SiftColors.bone, flexShrink: 1 },
  recentMeta: { ...SiftType.annot, color: SiftColors.boneDim },
  addRow: { flexDirection: 'row', marginTop: SiftSpacing.space1 },
  urlInput: {
    flex: 1,
    height: 32,
    minWidth: 0,
    backgroundColor: SiftColors.carbon,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    borderRightWidth: 0,
    color: SiftColors.bone,
    fontFamily: SiftType.label.fontFamily,
    fontSize: 11,
    paddingHorizontal: 8,
  },
  addButton: { minWidth: 0, height: 32, paddingHorizontal: 12 },
  hint: { ...SiftType.annot, color: SiftColors.boneDim },
});
