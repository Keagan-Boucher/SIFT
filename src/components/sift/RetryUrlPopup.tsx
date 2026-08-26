import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { Button } from './Button';
import { Input } from './Input';
import { Popup } from './Popup';

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
    <Popup text="RETRY_WITH_URL" suffix={domain} onClose={onClose} closeLabel="Close retry panel">
      <View style={styles.body}>
        <Text style={styles.blurb}>
          Search {domain} for anything, then paste the URL of its results page. That teaches SIFT this site&apos;s
          search for every future query, not just this one.
        </Text>
        <Input
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder={`https://${domain}/search?q=...`}
          accessibilityLabel="Search results URL"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={() => canSubmit && onSubmit(url)}
        />
        <Button variant="primary" disabled={!canSubmit} onPress={() => onSubmit(url)}>
          ADD LINK
        </Button>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  body: { padding: SiftSpacing.space3, gap: SiftSpacing.space2 },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },
  input: {
    height: 32,
    paddingHorizontal: SiftSpacing.space2,
    ...SiftType.body,
  },
});
