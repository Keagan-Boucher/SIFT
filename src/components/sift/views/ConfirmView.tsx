import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Check, Heading } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { CONFIRM_THRESHOLD, countWord } from '@/lib/map-to-view';

/**
 * 03 Confirm match, and 06 Weak match when every candidate scores below the
 * threshold. In the weak case skipping gets the acid: a bad match poisons the spread.
 */
export function ConfirmView({ flow }: { flow: SiftFlow }) {
  const { session, chosen, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const { candidates, confirmDomain } = session;
  const domain = confirmDomain ?? 'this site';
  const weak = candidates.length > 0 && candidates.every((candidate) => candidate.confidence < CONFIRM_THRESHOLD);
  const selected = chosen ?? (weak ? null : 0);
  const count = countWord(candidates.length).toLowerCase();
  const back = { label: 'Scan', onPress: () => actions.go('live') };

  if (!confirmDomain || candidates.length === 0) {
    return (
      <Screen
        back={back}
        icons={topIcons}
        aside={<Heading title="Nothing to confirm" sub="Every source matched well enough to trust." step={3} landscape={landscape} proseSub />}
        primary={{ label: 'Back to scan', onPress: back.onPress }}
      />
    );
  }

  const pct = (index: number) => Math.round(candidates[index].confidence * 100);
  const useIndex = selected ?? 0;

  return (
    <Screen
      back={back}
      icons={topIcons}
      aside={
        <Heading
          title={weak ? 'Nothing matches well' : 'Which one is it?'}
          sub={
            weak
              ? candidates.length === 1
                ? `The closest listing on ${domain} is a weak match. Using it would drag the spread down.`
                : `The ${count} closest listings on ${domain} are all weak matches. Using one would drag the spread down.`
              : `${domain} returned ${count} close ${candidates.length === 1 ? 'listing' : 'listings'}.`
          }
          step={3}
          landscape={landscape}
          proseSub
        />
      }
      ghost={weak ? { label: `Use ${pct(useIndex)}%`, onPress: () => actions.confirm(useIndex) } : { label: 'Skip', onPress: actions.skipSite }}
      primary={
        weak
          ? { label: 'Skip this site', onPress: actions.skipSite }
          : { label: 'Confirm', onPress: () => selected !== null && actions.confirm(selected), disabled: selected === null }
      }>
      <View style={styles.list}>
        {candidates.map((candidate, index) => {
          const on = selected === index;
          return (
            <Pressable
              key={`${candidate.url ?? candidate.title}-${index}`}
              onPress={() => actions.choose(index)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${candidate.title}, ${candidate.price}, ${pct(index)}% match`}
              style={[styles.card, on ? styles.cardOn : styles.cardOff]}>
              <View style={styles.cardText}>
                <Text style={[styles.title, { color: on ? SiftColors.text : SiftColors.textDim }]} numberOfLines={2}>
                  {candidate.title}
                </Text>
                <View style={styles.meta}>
                  <Text style={[styles.price, { color: on ? SiftColors.mint : SiftColors.text }]}>{candidate.price}</Text>
                  <Text style={[SiftType.label, { color: weak ? SiftColors.ember : SiftColors.textMute }]}>{`${pct(index)}% MATCH`}</Text>
                </View>
              </View>
              <Check on={on} size={26} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: SiftSpacing.s2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SiftSpacing.s4,
    borderRadius: SiftRadius,
    paddingHorizontal: SiftSpacing.s4,
    paddingVertical: SiftSpacing.s4,
  },
  cardOn: { backgroundColor: SiftColors.surfaceHi, borderWidth: 1.5, borderColor: SiftColors.mint },
  cardOff: { backgroundColor: SiftColors.surface, borderWidth: 1, borderColor: SiftColors.hairline },
  cardText: { flex: 1, gap: SiftSpacing.s2 },
  title: { fontFamily: SiftFontFamily.prose, fontSize: 14, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: SiftSpacing.s3 },
  price: { fontFamily: SiftFontFamily.monoBold, fontSize: 14 },
});
