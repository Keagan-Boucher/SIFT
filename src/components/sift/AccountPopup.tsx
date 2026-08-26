import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { CommandHeading } from './CommandHeading';
import { Button } from './Button';
import { Input } from './Input';
import { signInWithEmail, signOutUser, upgradeGuestToEmail } from '@/hooks/use-auth';

interface AccountPopupProps {
  /** 'demo' when no Firebase project is configured. */
  mode: 'live' | 'demo';
  isGuest: boolean;
  email: string | null;
  onClose: () => void;
}

type Intent = 'attach' | 'signin';

const COPY: Record<Intent, { heading: string; blurb: string; action: string }> = {
  attach: {
    heading: 'KEEP_THIS_SESSION',
    blurb:
      'You are signed in as a guest. Your searches and watches already belong to you. Attach an email to keep them if you reinstall or change device.',
    action: 'ATTACH EMAIL',
  },
  signin: {
    heading: 'SIGN_IN',
    blurb: 'Sign in to pick up saved searches from another device. This session stays as it is if it fails.',
    action: 'SIGN IN',
  },
};

export function AccountPopup({ mode, isGuest, email, onClose }: AccountPopupProps) {
  const [intent, setIntent] = useState<Intent>('attach');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const copy = COPY[intent];

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      if (intent === 'attach') {
        await upgradeGuestToEmail(emailInput.trim(), password);
        setDone('Email attached. This session is now a full account.');
      } else {
        await signInWithEmail(emailInput.trim(), password);
        setDone('Signed in.');
      }
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && emailInput.trim().length > 3 && password.length >= 6;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CommandHeading sigil="//" text="ACCOUNT" />
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close account panel">
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {mode === 'demo' ? (
          <Text style={styles.blurb}>
            No Firebase project is configured, so SIFT is running on its seeded dataset. Accounts, live scraping
            and watches need a project in .env.
          </Text>
        ) : !isGuest ? (
          <>
            <Text style={styles.status}>SIGNED IN</Text>
            <Text style={styles.blurb}>{email ?? 'Account with no email on file.'}</Text>
            <Button variant="ghost" onPress={() => void signOutUser()}>
              SIGN OUT
            </Button>
          </>
        ) : (
          <>
            <View style={styles.tabs}>
              {(['attach', 'signin'] as Intent[]).map((option) => (
                <Pressable key={option} onPress={() => setIntent(option)} style={styles.tab}>
                  <Text style={[styles.tabLabel, intent === option && styles.tabLabelActive]}>
                    {COPY[option].heading}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.blurb}>{copy.blurb}</Text>

            <Input
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="email"
              accessibilityLabel="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Input
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="password, 6 characters or more"
              accessibilityLabel="Password"
              autoCapitalize="none"
              secureTextEntry
            />

            <Button variant="primary" disabled={!canSubmit} onPress={() => void submit()}>
              {busy ? 'WORKING' : copy.action}
            </Button>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {done && <Text style={styles.done}>{done}</Text>}
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
  tabs: { flexDirection: 'row', gap: SiftSpacing.space3 },
  tab: { paddingVertical: 2 },
  tabLabel: { ...SiftType.label, color: SiftColors.boneDim, textTransform: 'uppercase' },
  tabLabelActive: { color: SiftColors.bone },
  status: { ...SiftType.label, color: SiftColors.mint, textTransform: 'uppercase' },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },
  input: {
    height: 32,
    paddingHorizontal: SiftSpacing.space2,
    ...SiftType.body,
  },
  error: { ...SiftType.annot, color: SiftColors.ember },
  done: { ...SiftType.annot, color: SiftColors.mint },
});
