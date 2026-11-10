import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button, Heading, Label, Row, Tracker } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { fmtPrice } from '@/lib/format-price';
import { STEP_NUMBER } from '@/lib/map-to-view';

/** 01 Home. Its job is to get the user back into an unfinished search in one tap. */
export function HomeView({ flow }: { flow: SiftFlow }) {
  const { inProgress, finished, draft, topIcons, actions, session } = flow;
  const landscape = useOrientation() === 'landscape';
  const [showAll, setShowAll] = useState(false);

  // A search the backend is running wins over one only typed on this device.
  const resume = inProgress
    ? { name: inProgress.query, lowest: inProgress.lowest, step: STEP_NUMBER[inProgress.step], onPress: () => actions.openSearch(inProgress) }
    : draft
      ? { name: draft.query || 'Untitled search', lowest: null, step: 1 as const, onPress: actions.resumeDraft }
      : null;

  const rows = showAll ? finished : finished.slice(0, 3);

  return (
    <Screen
      icons={topIcons}
      aside={<Heading title="Searches" landscape={landscape} />}
      primary={{ label: 'New search', onPress: actions.newSearch }}>
      {session.error && <Text style={[SiftType.small, { color: SiftColors.ember }]}>{session.error}</Text>}

      {resume && (
        <View style={styles.card}>
          <Text style={styles.cardName} numberOfLines={2}>
            {resume.name}
          </Text>
          {resume.lowest !== null && (
            <Text style={styles.cardLowest}>
              LOWEST SO FAR{'  '}
              {fmtPrice(resume.lowest)}
            </Text>
          )}
          <View style={styles.cardTracker}>
            <Tracker step={resume.step} />
          </View>
          <Button label="Resume" arrow onPress={resume.onPress} />
        </View>
      )}

      {rows.length > 0 && (
        <View>
          {rows.map((search, index) => (
            <Row
              key={search.id}
              prose
              title={search.query}
              titleColor={SiftColors.textDim}
              onPress={() => actions.openSearch(search)}
              last={index === rows.length - 1 && (showAll || finished.length <= 3)}
              right={search.lowest !== null ? <Text style={styles.price}>{fmtPrice(search.lowest)}</Text> : <Label>NO PRICE</Label>}
            />
          ))}
          {!showAll && finished.length > 3 && (
            <Pressable onPress={() => setShowAll(true)} hitSlop={10} style={styles.more} accessibilityRole="button">
              <Label>{`SHOW ${finished.length - 3} MORE`}</Label>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SiftColors.surface,
    borderWidth: 1,
    borderColor: SiftColors.mint,
    borderRadius: SiftRadius,
    padding: SiftSpacing.s5,
    gap: SiftSpacing.s2,
  },
  cardName: { fontFamily: SiftFontFamily.prose, fontSize: 18, lineHeight: 24, color: SiftColors.text },
  cardLowest: { fontFamily: SiftFontFamily.monoBold, fontSize: 11, letterSpacing: 1.2, color: SiftColors.mint },
  cardTracker: { marginTop: SiftSpacing.s3, marginBottom: SiftSpacing.s4 },
  price: { fontFamily: SiftFontFamily.monoBold, fontSize: 14, color: SiftColors.text },
  more: { paddingVertical: SiftSpacing.s4 },
});
