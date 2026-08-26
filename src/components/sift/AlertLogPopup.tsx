import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Popup } from './Popup';

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
  title?: string;
  emptyText?: string;
}

export function AlertLogPopup({
  entries,
  count,
  onClose,
  title = 'ALERT_LOG',
  emptyText = 'No alerts yet. Dismissed alerts are kept here for the session.',
}: AlertLogPopupProps) {
  return (
    <Popup text={title} suffix={count} onClose={onClose} closeLabel="Close alert log" style={styles.wrap}>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
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
    </Popup>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 246 },
  empty: { ...SiftType.body, color: SiftColors.boneDim, padding: SiftSpacing.space3 },
  list: {},
  entry: { gap: 4, padding: SiftSpacing.space2, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: SiftColors.graphite },
  entryHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  entryLabel: { ...SiftType.label, color: SiftColors.boneDim },
  entryStamp: { ...SiftType.annot, color: SiftColors.boneDim },
  entryBody: { fontFamily: SiftFontFamily.system, fontSize: 11, lineHeight: 15, color: SiftColors.boneDim },
});
