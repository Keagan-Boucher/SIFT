import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button, Check, Hairline, Heading, Input, Label, Row } from '@/components/ui/kit';
import { SiftColors, SiftSpacing } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';

/** 02 New search. The query drives the suggested sites, so the field comes first. */
export function SourcesView({ flow }: { flow: SiftFlow }) {
  const { query, session, suggestions, allSuggestions, ownUrl, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';

  const staged = new Map(session.sources.map((source) => [source.domain, source]));
  const suggested = new Set(suggestions.map((s) => s.domain));
  // Anything added by hand or from a preset stays visible whatever the query suggests.
  const extras = session.sources
    .filter((source) => !suggested.has(source.domain))
    .map((source) => ({ domain: source.domain, reason: source.status === 'KNOWN' ? 'Page layout already known' : 'Added by you' }));
  const hidden = allSuggestions ? 0 : Math.max(0, suggestions.length - 3);
  const list = [...(allSuggestions ? suggestions : suggestions.slice(0, 3)), ...extras];

  return (
    <Screen
      back={{ label: 'Searches', onPress: () => actions.go('home') }}
      icons={topIcons}
      aside={<Heading title="What are you pricing?" step={1} landscape={landscape} />}
      primary={{
        label: 'Start scan',
        onPress: actions.startScan,
        disabled: !query.trim() || session.sources.length === 0,
      }}>
      <Input
        big
        value={query}
        onChangeText={actions.setQuery}
        placeholder="Product name"
        accessibilityLabel="Product name"
        autoFocus={!query}
        returnKeyType="done"
      />

      <View>
        {list.length > 0 && (
          <>
            <View style={styles.label}>
              <Label>SUGGESTED SITES</Label>
            </View>
            <Hairline />
          </>
        )}
        {list.map(({ domain, reason }) => {
          const on = staged.has(domain);
          return (
            <Row
              key={domain}
              title={domain}
              subtitle={reason}
              onPress={() => actions.toggleSource(domain)}
              accessibilityLabel={`${domain}, ${on ? 'added' : 'not added'}`}
              right={<Check on={on} offGlyph="plus" />}
            />
          );
        })}

        {ownUrl !== null && (
          <View style={styles.ownUrl}>
            <Input
              mono
              label="RETAILER URL"
              value={ownUrl}
              onChangeText={actions.setOwnUrl}
              onSubmitEditing={actions.addOwnUrl}
              placeholder="shop.co.za"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Retailer URL"
              style={styles.flex}
            />
            <Button variant="ghost" label="Add" onPress={actions.addOwnUrl} disabled={!ownUrl.trim()} />
          </View>
        )}

        <View style={styles.footer}>
          {hidden > 0 ? (
            <Pressable onPress={actions.showAllSuggestions} hitSlop={12} accessibilityRole="button">
              <Label color={SiftColors.textDim}>{`SHOW ${hidden} MORE`}</Label>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.footerRight}>
            <Pressable onPress={() => actions.go('presets')} hitSlop={12} accessibilityRole="button">
              <Label>PRESETS</Label>
            </Pressable>
            {ownUrl === null && (
              <Pressable onPress={() => actions.setOwnUrl('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add your own retailer URL">
                <Label>+ OWN URL</Label>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { paddingBottom: SiftSpacing.s2 },
  ownUrl: { flexDirection: 'row', alignItems: 'stretch', gap: SiftSpacing.s2, paddingTop: SiftSpacing.s3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SiftSpacing.s4 },
  footerRight: { flexDirection: 'row', gap: SiftSpacing.s5 },
});
