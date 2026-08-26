import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Popup } from './Popup';

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
  // Scraped URLs are not all well formed. Anything without a scheme is assumed
  // https rather than handed to the OS as an unopenable string.
  const href = /^https?:\/\//i.test(listing.url) ? listing.url : `https://${listing.url}`;
  const [failed, setFailed] = useState(false);

  const openListing = () => {
    setFailed(false);
    Linking.openURL(href).catch(() => setFailed(true));
  };

  return (
    <Popup text="LISTING_DETAIL" onClose={onClose} closeLabel="Close listing detail" style={[styles.wrap, style]}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Pressable onPress={openListing} accessibilityRole="link" accessibilityLabel={`Open ${listing.url}`}>
          <Text style={styles.url} numberOfLines={2}>
            {listing.url.replace(/^https?:\/\//i, '')}
          </Text>
          <Text style={failed ? styles.openFailed : styles.openHint}>
            {failed ? '!COULD NOT OPEN THIS LINK' : 'TAP TO OPEN IN BROWSER'}
          </Text>
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
    </Popup>
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
  wrap: { width: 320 },
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space2 },
  title: { ...SiftType.title, color: SiftColors.bone },
  url: { ...SiftType.annot, color: SiftColors.mint, textDecorationLine: 'underline' },
  openHint: { ...SiftType.annot, color: SiftColors.boneDim, marginTop: 2 },
  openFailed: { ...SiftType.annot, color: SiftColors.ember, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 12 },
  rowLabel: { ...SiftType.annot, color: SiftColors.boneDim, width: 90 },
  rowValue: { ...SiftType.annot, color: SiftColors.bone },
  issue: { ...SiftType.annot, color: SiftColors.ember },
});
