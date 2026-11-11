import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Hairline, Label, Stat, Tag } from '@/components/ui/kit';
import { SiftColors, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { TileView } from '@/types/view';

/** The overlay behind a tapped listing: what was found, from where, and a way to open it. */
export function ListingSheet({ tile, onClose }: { tile: TileView | null; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  if (!tile) return null;

  // Scraped URLs are not all well formed. Anything without a scheme is assumed https.
  const href = /^https?:\/\//i.test(tile.url) ? tile.url : `https://${tile.url}`;
  const close = () => {
    setFailed(false);
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close listing detail">
        {/* A press inside the panel must not fall through to the scrim. */}
        <Pressable style={styles.panel} accessibilityViewIsModal>
          <View style={styles.head}>
            <Label>{tile.domain}</Label>
            {tile.lowest && <Tag label="LOWEST" color={SiftColors.mint} />}
            {tile.issue && <Tag label="REVIEW" color={SiftColors.ember} />}
          </View>
          <Text style={styles.title} numberOfLines={3}>
            {tile.title}
          </Text>
          <Text style={[SiftType.price, { color: tile.lowest ? SiftColors.mint : SiftColors.text }]}>{tile.price}</Text>
          <Hairline />
          <Stat label="SOURCE" value={tile.domain} />
          <Text style={[SiftType.small, { color: failed ? SiftColors.ember : SiftColors.textMute }]} numberOfLines={2}>
            {failed ? 'Could not open this link.' : tile.url.replace(/^https?:\/\//i, '')}
          </Text>
          <View style={styles.actions}>
            <Button label="Close" variant="ghost" onPress={close} style={styles.flex} />
            <Button
              label="Open listing"
              arrow
              onPress={() => {
                setFailed(false);
                Linking.openURL(href).catch(() => setFailed(true));
              }}
              style={styles.flex}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: SiftSpacing.s5 },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: SiftColors.surface,
    borderWidth: 1,
    borderColor: SiftColors.hairline,
    borderRadius: SiftRadius,
    padding: SiftSpacing.s5,
    gap: SiftSpacing.s3,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s3 },
  title: { ...SiftType.body, color: SiftColors.text },
  actions: { flexDirection: 'row', gap: SiftSpacing.s3, marginTop: SiftSpacing.s2 },
});
