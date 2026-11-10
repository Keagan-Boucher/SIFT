import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button, Heading, Input, Label, Row } from '@/components/ui/kit';
import { Icon } from '@/components/ui/Icon';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { signInWithEmail, signOutUser, upgradeGuestToEmail } from '@/hooks/use-auth';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';
import { clearTourSeen } from '@/lib/onboarding';

type Intent = 'attach' | 'signin';

const COPY: Record<Intent, { tab: string; blurb: string; action: string }> = {
  attach: { tab: 'KEEP THIS SESSION', blurb: 'Signed in as a guest. Attach an email to keep your searches.', action: 'Attach email' },
  signin: { tab: 'SIGN IN', blurb: 'Sign in to pick up searches from another device.', action: 'Sign in' },
};

export function AccountView({ flow }: { flow: SiftFlow }) {
  const { noBackend, isGuest, accountEmail, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const [intent, setIntent] = useState<Intent>('attach');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      if (intent === 'attach') {
        await upgradeGuestToEmail(email.trim(), password);
        setDone('Email attached. This session is now a full account.');
      } else {
        await signInWithEmail(email.trim(), password);
        setDone('Signed in.');
      }
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const showForm = !noBackend && isGuest;
  const canSubmit = !busy && email.trim().length > 3 && password.length >= 6;
  const arrow = <Icon name="arrow" size={11} color={SiftColors.textMute} />;

  return (
    <Screen
      back={{ label: 'Searches', onPress: () => actions.go('home') }}
      icons={topIcons}
      aside={<Heading title="Account" landscape={landscape} />}
      primary={showForm ? { label: busy ? 'Working' : COPY[intent].action, onPress: () => void submit(), disabled: !canSubmit } : undefined}>
      {noBackend ? (
        <Text style={[SiftType.body, styles.dim]}>
          No Firebase project is configured. Accounts, scanning and the watchlist need a project in .env.
        </Text>
      ) : !isGuest ? (
        <View style={styles.block}>
          <Label>SIGNED IN</Label>
          <Text style={[SiftType.body, { color: SiftColors.text }]}>{accountEmail ?? 'Account with no email on file.'}</Text>
          <Button variant="ghost" label="Sign out" onPress={() => void signOutUser()} style={styles.signOut} />
        </View>
      ) : (
        <View style={styles.block}>
          <View style={styles.tabs}>
            {(['attach', 'signin'] as Intent[]).map((option) => (
              <Pressable key={option} onPress={() => setIntent(option)} hitSlop={12} accessibilityRole="tab" accessibilityState={{ selected: intent === option }}>
                <Label color={intent === option ? SiftColors.text : SiftColors.textMute}>{COPY[option].tab}</Label>
              </Pressable>
            ))}
          </View>
          <Text style={[SiftType.body, styles.dim]}>{COPY[intent].blurb}</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            accessibilityLabel="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password, 6 characters or more"
            accessibilityLabel="Password"
            autoCapitalize="none"
            secureTextEntry
          />
        </View>
      )}

      {error && <Text style={[SiftType.small, { color: SiftColors.ember }]} accessibilityRole="alert">{error}</Text>}
      {done && <Text style={[SiftType.small, { color: SiftColors.mint }]}>{done}</Text>}

      <Row
        prose
        title="Replay the tour"
        onPress={() => void clearTourSeen().then(() => router.replace('/onboarding'))}
        right={arrow}
        last
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: SiftSpacing.s3 },
  tabs: { flexDirection: 'row', gap: SiftSpacing.s5 },
  dim: { color: SiftColors.textDim },
  signOut: { alignSelf: 'flex-start', marginTop: SiftSpacing.s2 },
});
