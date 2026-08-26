import type { StyleProp, ViewStyle } from 'react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';

export interface ListingDetail {
  title: string;
  url: string;
  priceLine: string;
  method: string;
  confidenceLine: string;
  stock: string;
  checked: string;
  issue: boolean;
}

interface ListingDetailPopupProps {
  listing: ListingDetail;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ListingDetailPopup({ listing, onClose, style }: ListingDetailPopupProps) {
  // A listing the user cannot reach is half a result: the URL opens the page.
  // A URL the device refuses to handle simply does nothing, as before.
  const openListing = () => {
    Linking.openURL(listing.url).catch(() => {});
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.header}>
        <CommandHeading sigil="//" text="LISTING_DETAIL" />
        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Pressable onPress={openListing} accessibilityRole="link" accessibilityLabel={`Open ${listing.url}`}>
          <Text style={styles.url} numberOfLines={2}>
            {listing.url}
          </Text>
          <Text style={styles.openHint}>TAP TO OPEN IN BROWSER</Text>
        </Pressable>
        <View style={styles.grid}>
          <Row label="PRICE" value={listing.priceLine} />
          <Row label="METHOD" value={listing.method} />
          <Row label="CONFIDENCE" value={listing.confidenceLine} />
          <Row label="STOCK" value={listing.stock} />
          <Row label="CHECKED" value={listing.checked} />
        </View>
        {listing.issue && <Text style={styles.issue}>!REVIEW · 2 CANDIDATES, NEITHER ABOVE 60%</Text>}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 320,
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
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space2 },
  title: { ...SiftType.title, color: SiftColors.bone },
  url: { ...SiftType.annot, color: SiftColors.mint, textDecorationLine: 'underline' },
  openHint: { ...SiftType.annot, color: SiftColors.boneDim, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 12 },
  rowLabel: { ...SiftType.annot, color: SiftColors.boneDim, width: 90 },
  rowValue: { ...SiftType.annot, color: SiftColors.bone },
  issue: { ...SiftType.annot, color: SiftColors.ember },
});
