import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/sift/Button';
import { CommandHeading } from '@/components/sift/CommandHeading';
import { Input } from '@/components/sift/Input';
import { SourceChip } from '@/components/sift/SourceChip';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface SourcesViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function SourcesView({ flow, orientation }: SourcesViewProps) {
  const { state, sourceCountLabel, recentCount, sources, recents, actions } = flow;

  const sourcesBlock = (
    <View style={orientation === 'landscape' ? styles.sourcesColLandscape : styles.sourcesColPortrait}>
      <CommandHeading sigil="//" text="SOURCES" suffix={sourceCountLabel} />
      {sources.map((s) => (
        <SourceChip key={s.domain} domain={s.domain} status={s.status} onPress={() => actions.removeSource(s.domain)} />
      ))}
      <View style={styles.addRow}>
        <Input
          value={state.input}
          onChangeText={actions.setInput}
          onSubmitEditing={actions.addSourceFromInput}
          placeholder="paste retailer url"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Retailer URL"
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
      <CommandHeading sigil="//" text="QUERY" />
      <View style={styles.queryBox}>
        <Input
          value={state.query}
          onChangeText={actions.setQuery}
          placeholder="input desired item"
          accessibilityLabel="Search query"
          style={styles.queryInput}
        />
      </View>
    </View>
  );

  const recentBlock = (
    <View style={styles.recentCol}>
      <CommandHeading sigil="//" text="RECENT" suffix={recentCount} />
      {recents.map((r) => (
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
    borderWidth: 0,
    borderBottomWidth: 1,
    fontFamily: SiftType.body.fontFamily,
    fontSize: 20,
    paddingHorizontal: 12,
  },
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
    height: 34,
    minWidth: 0,
    borderRightWidth: 0,
    fontFamily: SiftType.body.fontFamily,
    fontSize: 14,
    paddingHorizontal: SiftSpacing.space3,
  },
  addButton: { minWidth: 0, height: 44, paddingHorizontal: 12 },
  hint: { ...SiftType.annot, color: SiftColors.boneDim },
});
