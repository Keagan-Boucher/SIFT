import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Button } from './Button';
import { CommandHeading } from './CommandHeading';

interface RetryUrlPopupProps {
  domain: string;
  onSubmit: (url: string) => void;
  onClose: () => void;
}

/**
 * Method D: the site's search page could not be worked out from its homepage
 * alone. Pasting the URL the site itself uses for a search teaches the
 * registry that route directly, so this domain resolves on its own for
 * every search after this one, not just this retry.
 */
export function RetryUrlPopup({ domain, onSubmit, onClose }: RetryUrlPopupProps) {
  const [url, setUrl] = useState('');
  const canSubmit = /^https?:\/\/.+/i.test(url.trim());

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CommandHeading sigil="//" text="RETRY_WITH_URL" suffix={domain} />
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close retry panel">
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.blurb}>
          Search {domain} for anything, then paste the URL of its results page. That teaches SIFT this site&apos;s
          search for every future query, not just this one.
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder={`https://${domain}/search?q=...`}
          placeholderTextColor={SiftColors.boneDim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={() => canSubmit && onSubmit(url)}
        />
        <Button variant="primary" disabled={!canSubmit} onPress={() => onSubmit(url)}>
          RETRY
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 344,
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
    paddingHorizontal: SiftSpacing.space3,
  },
  close: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { fontFamily: SiftFontFamily.system, fontSize: 14, color: SiftColors.boneDim },
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space2 },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },
  input: {
    height: 32,
    borderWidth: 1,
    borderColor: SiftColors.graphite,
    paddingHorizontal: SiftSpacing.space2,
    ...SiftType.body,
    color: SiftColors.bone,
  },
});
