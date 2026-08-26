import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { SourceChip } from '@/components/sift/SourceChip';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { isDomainKnown } from '@/lib/registry';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface PresetsViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

/** Curated categories, each cascading open to the sources ADD SOURCES will stage. */
export function PresetsView({ flow }: PresetsViewProps) {
  const { presetCategories, presetCategory, actions } = flow;
  // One registry read per domain, the first time its category is opened. The
  // answer is the same for everyone, so it is cached for the rest of the visit.
  const [known, setKnown] = useState<Record<string, boolean>>({});

  const openDomains = presetCategory?.domains;
  useEffect(() => {
    if (!openDomains) return;
    let live = true;
    openDomains
      .filter((domain) => known[domain] === undefined)
      .forEach((domain) => {
        isDomainKnown(domain)
          .then((result) => live && setKnown((current) => ({ ...current, [domain]: result })))
          .catch(() => {});
      });
    return () => {
      live = false;
    };
    // known is read, not tracked: adding it would re-run the effect on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDomains]);

  return (
    <View style={styles.wrap}>
      <CommandHeading sigil="//" text="PRESETS" suffix={String(presetCategories.length).padStart(2, '0')} />
      {presetCategories.map((category) => {
        const open = presetCategory?.id === category.id;
        return (
          <View key={category.id} style={[styles.group, open && styles.groupOpen]}>
            <Pressable
              onPress={() => actions.openCategory(category.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={styles.header}>
              <Text style={[styles.caret, open && styles.caretOpen]}>{open ? '▾' : '▸'}</Text>
              <View style={styles.headerText}>
                <Text style={[styles.name, open && styles.nameOpen]}>{category.name}</Text>
                <Text style={styles.blurb} numberOfLines={1}>
                  {category.blurb}
                </Text>
              </View>
              <Text style={styles.count}>{String(category.domains.length).padStart(2, '0')}</Text>
            </Pressable>
            {open && (
              <View style={styles.domains}>
                {category.domains.map((domain) => (
                  <SourceChip key={domain} domain={domain} status={known[domain] ? 'KNOWN' : 'PENDING'} />
                ))}
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.hint}>
        {presetCategory
          ? `ADD SOURCES STAGES ALL ${presetCategory.domains.length} INTO //SOURCES`
          : 'TAP A CATEGORY TO SEE ITS SOURCES'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: SiftSpacing.space4, gap: SiftSpacing.space2 },
  group: { borderLeftWidth: 2, borderLeftColor: SiftColors.graphite, backgroundColor: SiftColors.carbon },
  groupOpen: { borderLeftColor: SiftColors.mint },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 10 },
  caret: { ...SiftType.annot, color: SiftColors.boneDim },
  caretOpen: { color: SiftColors.mint },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...SiftType.label, fontSize: 12, letterSpacing: 1, color: SiftColors.boneDim, textTransform: 'uppercase' },
  nameOpen: { color: SiftColors.bone },
  blurb: { ...SiftType.annot, color: SiftColors.boneDim },
  count: { ...SiftType.annot, color: SiftColors.boneDim },
  domains: { gap: 2, paddingHorizontal: 10, paddingBottom: 10 },
  hint: { ...SiftType.annot, color: SiftColors.boneDim, marginTop: SiftSpacing.space1 },
});
