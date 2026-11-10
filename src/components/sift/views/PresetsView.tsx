import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Dot, Heading, Label } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { PRESET_CATEGORIES } from '@/lib/presets';
import { useKnownDomains } from '@/lib/registry';

/**
 * 12 Presets. One category open at a time. READY means the registry already
 * knows the site's layout; FIRST RUN is not an error, only a slower first scan.
 */
export function PresetsView({ flow }: { flow: SiftFlow }) {
  const { presetCategory, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const open = PRESET_CATEGORIES.find((category) => category.id === presetCategory) ?? null;
  const known = useKnownDomains(open?.domains ?? []);

  return (
    <Screen
      back={{ label: 'Sources', onPress: () => actions.go('sources') }}
      icons={topIcons}
      aside={<Heading title="Presets" step={1} landscape={landscape} />}
      primary={{
        label: open ? `Add ${open.domains.length} ${open.domains.length === 1 ? 'source' : 'sources'}` : 'Add sources',
        onPress: actions.addPreset,
        disabled: !open,
      }}>
      <View>
        {PRESET_CATEGORIES.map((category) => {
          const isOpen = category.id === open?.id;
          return (
            <View key={category.id} style={styles.group}>
              <Pressable
                onPress={() => actions.openCategory(category.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${category.name}, ${category.domains.length} sources`}
                style={[styles.header, isOpen && styles.headerOpen]}>
                <View style={styles.headerText}>
                  <Text style={[styles.name, { color: isOpen ? SiftColors.text : SiftColors.textDim }]}>{category.name}</Text>
                  <Text style={[SiftType.small, { color: SiftColors.textMute }]} numberOfLines={1}>
                    {category.blurb}
                  </Text>
                </View>
                <Text style={[styles.count, { color: isOpen ? SiftColors.mint : SiftColors.textMute }]}>
                  {String(category.domains.length).padStart(2, '0')}
                </Text>
              </Pressable>
              {isOpen &&
                category.domains.map((domain) => (
                  <View key={domain} style={styles.domain}>
                    <Dot color={known[domain] ? SiftColors.mint : SiftColors.textMute} />
                    <Text style={[SiftType.data, styles.domainText]}>{domain}</Text>
                    <Label>{known[domain] ? 'READY' : 'FIRST RUN'}</Label>
                  </View>
                ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderBottomWidth: 1, borderBottomColor: SiftColors.hairline, paddingVertical: SiftSpacing.s2 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: SiftSpacing.s3 },
  headerOpen: { borderLeftWidth: 2, borderLeftColor: SiftColors.mint, paddingLeft: SiftSpacing.s3 },
  headerText: { flex: 1, gap: 3 },
  name: { fontFamily: SiftFontFamily.prose, fontSize: 15, lineHeight: 20 },
  count: { fontFamily: SiftFontFamily.monoBold, fontSize: 13 },
  domain: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s3, minHeight: 34, paddingLeft: SiftSpacing.s4 },
  domainText: { flex: 1, color: SiftColors.text, fontSize: 12.5 },
});
