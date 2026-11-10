import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SiftMark } from '@/components/sift/SiftMark';
import { Button, Input } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { continueAsGuest, sendPasswordReset, signInWithEmail, signUpWithEmail, useAuth } from '@/hooks/use-auth';
import { useOrientation } from '@/hooks/use-orientation';
import { isFirebaseConfigured } from '@/lib/firebase';

type Mode = 'login' | 'signup';
type Destination = '/app' | '/onboarding';

const COPY: Record<Mode, { heading: string; blurb: string; action: string }> = {
  login: {
    heading: 'Log in',
    blurb: 'Pick up your searches and watchlist on this device.',
    action: 'Log in',
  },
  signup: {
    heading: 'Create account',
    blurb: 'Keep your searches and track prices over time.',
    action: 'Create account',
  },
};

export default function AuthScreen() {
  const orientation = useOrientation();
  const { hasAccount } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  /**
   * Where this screen hands off to. Signing up flips hasAccount from the auth
   * listener mid-submit, so the redirect below can win the race against
   * enter(); it is held in state so both exits agree on the destination.
   */
  const [destination, setDestination] = useState<Destination>('/app');

  // An account that restores after the splash gave up waiting still belongs in
  // the app, not at the gate. A guest does not: they came here to choose.
  const signedIn = hasAccount;

  const copy = COPY[mode];
  const landscape = orientation === 'landscape';

  // Firebase's own minimum. Checked here so the button says no before the network does.
  const canSubmit = !busy && email.trim().length > 3 && password.length >= 6;

  function enter(next: Destination = destination): void {
    router.replace(next);
  }

  async function run(action: () => Promise<void>, next: Destination): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      enter(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function submit(): void {
    // Logging in means a return visit, so only a fresh account gets the tour.
    const next: Destination = mode === 'signup' ? '/onboarding' : '/app';
    setDestination(next);
    if (!isFirebaseConfigured) return enter(next);
    run(
      () => (mode === 'login' ? signInWithEmail(email.trim(), password) : signUpWithEmail(name, email.trim(), password)),
      next,
    );
  }

  function guest(): void {
    setDestination('/onboarding');
    if (!isFirebaseConfigured) return enter('/onboarding');
    run(continueAsGuest, '/onboarding');
  }

  function reset(): void {
    if (!isFirebaseConfigured || !email.trim()) {
      return setError('Enter your email address first, then ask for a reset link.');
    }
    setError(null);
    sendPasswordReset(email.trim())
      .then(() => setSent(true))
      .catch((cause: Error) => setError(cause.message));
  }

  function swap(): void {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
  }

  const fields = (
    <>
      {mode === 'signup' && (
        <Input value={name} onChangeText={setName} placeholder="Name" accessibilityLabel="Name" autoComplete="name" />
      )}
      <Input
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
      />
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        secureTextEntry
      />
    </>
  );

  const notice = !isFirebaseConfigured ? (
    <Text style={styles.notice}>No Firebase project is configured, so nothing will be saved.</Text>
  ) : sent ? (
    <Text style={[styles.notice, { color: SiftColors.mint }]}>Reset link sent. Check your inbox.</Text>
  ) : error ? (
    <Text style={styles.error} accessibilityRole="alert">
      {error}
    </Text>
  ) : null;

  const forgot =
    mode === 'login' ? (
      <Text style={styles.forgot} onPress={reset} accessibilityRole="button">
        FORGOT PASSWORD
      </Text>
    ) : null;

  const swapLine = (
    <Text style={styles.swapLine}>
      {mode === 'login' ? 'No account? ' : 'Have an account? '}
      <Text style={styles.swapAction} onPress={swap} accessibilityRole="button">
        {mode === 'login' ? 'Create one' : 'Log in'}
      </Text>
    </Text>
  );

  const brand = (
    <View style={styles.wordmarkRow}>
      <SiftMark width={18} />
      <Text style={styles.wordmark}>SIFT</Text>
    </View>
  );

  if (signedIn) {
    return <Redirect href={destination} />;
  }

  if (landscape) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.landscapeBody}>
            <View style={styles.landscapeIntro}>
              {brand}
              <Text style={styles.heading}>{copy.heading}</Text>
              <Text style={styles.blurb}>{copy.blurb}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.landscapeForm} keyboardShouldPersistTaps="handled">
              {fields}
              {forgot}
              {notice}
              <View style={styles.landscapeActions}>
                <Button variant="ghost" label="Continue as guest" onPress={guest} disabled={busy} />
                <Button label={busy ? 'Working' : copy.action} onPress={submit} disabled={!canSubmit} />
              </View>
              {swapLine}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.portraitBody} keyboardShouldPersistTaps="handled">
          {brand}
          <Text style={styles.heading}>{copy.heading}</Text>
          <Text style={styles.blurb}>{copy.blurb}</Text>
          <View style={styles.fieldStack}>{fields}</View>
          {forgot}
          {notice}
          <View style={styles.spacer} />
          {swapLine}
        </ScrollView>
        <View style={styles.actionBar}>
          <Button variant="ghost" label="Guest" onPress={guest} disabled={busy} />
          <Button label={busy ? 'Working' : copy.action} onPress={submit} disabled={!canSubmit} style={styles.flex} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SiftColors.canvas },
  flex: { flex: 1 },

  landscapeBody: { flex: 1, flexDirection: 'row' },
  landscapeIntro: { width: 280, padding: SiftSpacing.s5, gap: SiftSpacing.s3 },
  landscapeForm: { flexGrow: 1, justifyContent: 'center', gap: SiftSpacing.s3, padding: SiftSpacing.s5 },
  landscapeActions: { flexDirection: 'row', gap: SiftSpacing.s3 },

  portraitBody: { flexGrow: 1, padding: SiftSpacing.s5, gap: SiftSpacing.s3 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s2, marginBottom: SiftSpacing.s6 },
  wordmark: { fontFamily: SiftFontFamily.monoBold, fontSize: 13, letterSpacing: 1, color: SiftColors.text },
  heading: { ...SiftType.title, color: SiftColors.text },
  blurb: { ...SiftType.body, color: SiftColors.textDim, marginBottom: SiftSpacing.s3 },
  fieldStack: { gap: SiftSpacing.s3 },
  spacer: { flex: 1, minHeight: SiftSpacing.s6 },
  actionBar: {
    flexDirection: 'row',
    gap: SiftSpacing.s3,
    padding: SiftSpacing.s5,
    paddingTop: SiftSpacing.s4,
    borderTopWidth: 1,
    borderTopColor: SiftColors.hairline,
  },

  notice: { ...SiftType.small, color: SiftColors.textMute },
  error: { ...SiftType.small, color: SiftColors.ember },
  forgot: { ...SiftType.label, color: SiftColors.textMute, alignSelf: 'flex-end', paddingVertical: SiftSpacing.s2 },
  swapLine: { ...SiftType.body, color: SiftColors.textDim, textAlign: 'center' },
  swapAction: { color: SiftColors.text, textDecorationLine: 'underline' },
});
