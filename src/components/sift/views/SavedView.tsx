import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/sift/Button';
import { CommandHeading } from '@/components/sift/CommandHeading';
import { CountChip } from '@/components/sift/CountChip';
import { Tag } from '@/components/sift/Tag';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { fmtPrice } from '@/lib/format-price';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface SavedViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function SavedView({ flow, orientation }: SavedViewProps) {
  const { saved, actions } = flow;

  return (
    <View style={styles.wrap}>
      <CommandHeading sigil="//" text="SAVED" suffix={String(saved.length).padStart(2, '0')} />
      {saved.map((item) => {
        const dropped = item.justDropped;
        const deltaLine = dropped ? `${fmtPrice(item.wasValue!)} → ${fmtPrice(item.value)}, ▼ ${Math.round(((item.wasValue! - item.value) / item.wasValue!) * 1000) / 10}% DOWN` : null;
        const tagLabel = dropped ? 'DROPPED' : item.checked ? 'NO CHANGE' : 'WATCHING';
        return (
          <View
            key={item.id}
            style={[
              orientation === 'landscape' ? styles.rowLandscape : styles.rowPortrait,
              { borderColor: dropped ? SiftColors.mint : SiftColors.graphite, borderWidth: dropped ? 2 : 1 },
            ]}>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {orientation === 'portrait' && <Tag label={tagLabel} tone={dropped ? 'mint' : 'neutral'} />}
              </View>
              <View style={styles.metaRow}>
                <CountChip count={item.sources} />
                <Text style={styles.metaText}>SOURCES · {item.lastChecked ?? 'NEVER CHECKED'}</Text>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{fmtPrice(item.value)}</Text>
                {deltaLine && <Text style={styles.delta}>{deltaLine}</Text>}
              </View>
              {orientation === 'landscape' && <Tag label={tagLabel} tone={dropped ? 'mint' : 'neutral'} />}
              <Button
                variant="ghost"
                disabled={item.checked}
                onPress={() => actions.checkItem(item.id)}
                style={styles.checkButton}
                textStyle={styles.checkButtonText}>
                {item.checked ? 'CHECKED' : 'CHECK NOW'}
              </Button>
            </View>
          </View>
        );
      })}
      <Text style={styles.hint}>CHECK RE-SCRAPES SOURCES AND FLAGS ANY PRICE BELOW THE LAST SAVED VALUE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: SiftSpacing.space4, gap: SiftSpacing.space3 },
  rowLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    backgroundColor: SiftColors.carbon,
  },
  rowPortrait: { flexDirection: 'column', gap: 6, padding: 12, backgroundColor: SiftColors.carbon },
  info: { gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 160 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { ...SiftType.body, fontSize: 14, color: SiftColors.bone },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { ...SiftType.annot, color: SiftColors.boneDim },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  priceCol: { alignItems: 'flex-end', gap: 2 },
  price: { ...SiftType.priceM, color: SiftColors.bone },
  delta: { ...SiftType.annot, color: SiftColors.mint },
  checkButton: { minWidth: 96, height: 28, paddingHorizontal: 8 },
  checkButtonText: { fontSize: 11 },
  hint: { ...SiftType.annot, color: SiftColors.boneDim },
});
