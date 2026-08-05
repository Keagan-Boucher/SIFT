import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';

export interface ArchiveLogEntry {
  id: string;
  label: string;
  stamp: string;
  body: string;
}

interface AlertLogPopupProps {
  entries: ArchiveLogEntry[];
  count: string;
  onClose: () => void;
}

export function AlertLogPopup({ entries, count, onClose }: AlertLogPopupProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CommandHeading sigil="//" text="ALERT_LOG" suffix={count} />
        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No alerts yet. Dismissed alerts are kept here for the session.</Text>
      ) : (
        <ScrollView style={styles.list}>
          {entries.map((log) => (
            <View key={log.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryLabel}>{log.label}</Text>
                <Text style={styles.entryStamp}>{log.stamp}</Text>
              </View>
              <Text style={styles.entryBody}>{log.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 344,
    maxHeight: 246,
    backgroundColor: SiftColors.void,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
  },
  header: {
    height: 28,
    backgroundColor: SiftColors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: SiftColors.graphite },
  closeLabel: { color: SiftColors.bone, fontSize: 14, lineHeight: 14 },
  empty: { ...SiftType.body, color: SiftColors.boneDim, padding: SiftSpacing.space3 },
  list: {},
  entry: { gap: 4, padding: SiftSpacing.space2, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: SiftColors.graphite },
  entryHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  entryLabel: { ...SiftType.label, color: SiftColors.boneDim },
  entryStamp: { ...SiftType.annot, color: SiftColors.boneDim },
  entryBody: { fontFamily: SiftFontFamily.system, fontSize: 11, lineHeight: 15, color: SiftColors.boneDim },
});
