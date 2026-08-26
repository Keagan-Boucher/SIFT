import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/sift/Button';
import { Input } from '@/components/sift/Input';
import { Rail } from '@/components/sift/Rail';
import { SiftMark } from '@/components/sift/SiftMark';
import { SiftColors, SiftFontFamily, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { continueAsGuest, sendPasswordReset, signInWithEmail, signUpWithEmail, useAuth } from '@/hooks/use-auth';
import { useOrientation } from '@/hooks/use-orientation';
import { isFirebaseConfigured } from '@/lib/firebase';

type Mode = 'login' | 'signup';
type Destination = '/app' | '/onboarding';

const COPY: Record<Mode, { heading: string; blurb: string; action: string; railName: string }> = {
  login: {
    heading: '>LOG_IN',
    blurb: 'Sign in to sync sources and price history across sessions.',
    action: 'LOG IN',
    railName: 'LOG IN',
  },
  signup: {
    heading: '>CREATE_ACCOUNT',
    blurb: 'Create an account to save sources and track price history.',
    action: 'CREATE ACCOUNT',
    railName: 'SIGN UP',
  },
};

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  height: number;
  secure?: boolean;
  email?: boolean;
}

function Field({ label, value, onChangeText, placeholder, height, secure, email }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={email ? 'email' : secure ? 'current-password' : 'name'}
        keyboardType={email ? 'email-address' : 'default'}
        accessibilityLabel={label}
        style={[styles.input, { height }]}
      />
    </View>
  );
}

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
  const fieldHeight = landscape ? 34 : 44;

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
      return setError('Enter your email address first, then tap FORGOT PASSWORD.');
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
        <Field label="NAME" value={name} onChangeText={setName} placeholder="Full name" height={fieldHeight} />
      )}
      <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@domain.com" height={fieldHeight} email />
      <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="••••••••" height={fieldHeight} secure />
    </>
  );

  const notice = !isFirebaseConfigured ? (
    <Text style={styles.notice}>!NO_PROJECT_CONFIGURED — SIFT WILL RUN ON ITS DEMO DATASET</Text>
  ) : sent ? (
    <Text style={styles.notice}>{'//RESET_LINK_SENT — CHECK YOUR INBOX'}</Text>
  ) : error ? (
    <Text style={styles.error} accessibilityRole="alert">
      !{error}
    </Text>
  ) : null;

  const forgot =
    mode === 'login' ? (
      <Text style={styles.forgot} onPress={reset}>
        FORGOT PASSWORD?
      </Text>
    ) : null;

  const swapLine = (
    <Text style={styles.swapLine}>
      {mode === 'login' ? 'NO ACCOUNT? ' : 'HAVE AN ACCOUNT? '}
      <Text style={styles.swapAction} onPress={swap}>
        {mode === 'login' ? 'CREATE ONE' : 'LOG IN'}
      </Text>
    </Text>
  );

  if (signedIn) {
    return <Redirect href={destination} />;
  }

  if (landscape) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.landscapeBody}>
            <Rail screenName={copy.railName} sourceCount={0} />
            <View style={styles.landscapeIntro}>
              <Text style={styles.heading}>{copy.heading}</Text>
              <Text style={styles.blurb}>{copy.blurb}</Text>
            </View>
            <View style={styles.landscapeForm}>
              <View style={styles.fieldStack}>{fields}</View>
              {forgot}
              {notice}
              <View style={styles.landscapeActions}>
                <Button variant="primary" onPress={submit} disabled={!canSubmit} style={styles.landscapePrimary}>
                  {busy ? '...' : copy.action}
                </Button>
                <Button variant="ghost" onPress={guest} disabled={busy} style={styles.landscapeGuest}>
                  CONTINUE AS GUEST
                </Button>
              </View>
              {swapLine}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.portraitBody} keyboardShouldPersistTaps="handled">
        <View style={styles.wordmarkRow}>
          <SiftMark width={24} />
          <Text style={styles.wordmark}>SIFT</Text>
        </View>

        <Text style={[styles.heading, styles.portraitHeading]}>{copy.heading}</Text>
        <Text style={[styles.blurb, styles.portraitBlurb]}>{copy.blurb}</Text>

        <View style={styles.portraitFieldStack}>{fields}</View>
        {forgot}
        {notice}

        <Button variant="primary" onPress={submit} disabled={!canSubmit} style={styles.fullWidth}>
          {busy ? '...' : copy.action}
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerRule} />
          <Text style={styles.dividerLabel}>OR</Text>
          <View style={styles.dividerRule} />
        </View>

        <Button variant="ghost" onPress={guest} disabled={busy} style={styles.fullWidth}>
          CONTINUE AS GUEST
        </Button>

          <View style={styles.spacer} />
          {swapLine}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SiftColors.void },
  flex: { flex: 1 },

  landscapeBody: { flex: 1, flexDirection: 'row', minHeight: 0 },
  landscapeIntro: {
    width: 280,
    paddingVertical: SiftSpacing.space6,
    paddingHorizontal: SiftSpacing.space5,
    gap: SiftSpacing.space3,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: SiftColors.graphite,
  },
  landscapeForm: {
    flex: 1,
    justifyContent: 'center',
    gap: SiftSpacing.space2,
    paddingHorizontal: SiftSpacing.space5,
    paddingVertical: SiftSpacing.space3,
  },
  landscapeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SiftSpacing.space3,
  },
  landscapePrimary: { flexShrink: 0, minWidth: 150 },
  landscapeGuest: { flexShrink: 0, minWidth: 230 },

  portraitBody: {
    flexGrow: 1,
    paddingTop: SiftSpacing.space7,
    paddingHorizontal: SiftSpacing.space5,
    paddingBottom: SiftSpacing.space6,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SiftSpacing.space2,
    marginBottom: SiftSpacing.space6,
  },
  wordmark: { ...SiftType.displayM, color: SiftColors.bone, textTransform: 'uppercase' },
  portraitBlurb: { marginBottom: SiftSpacing.space6, maxWidth: 320 },
  portraitFieldStack: { gap: SiftSpacing.space4, marginBottom: SiftSpacing.space5 },
  fullWidth: { width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.space3, marginVertical: SiftSpacing.space5 },
  dividerRule: { flex: 1, height: 1, backgroundColor: SiftColors.graphite },
  dividerLabel: { ...SiftType.annot, color: SiftColors.boneDim },
  spacer: { flex: 1, minHeight: SiftSpacing.space6 },

  heading: { ...SiftType.label, color: SiftColors.acid, textTransform: 'uppercase' },
  portraitHeading: { marginBottom: SiftSpacing.space2 },
  blurb: { ...SiftType.body, color: SiftColors.boneDim },

  fieldStack: { gap: SiftSpacing.space2 },
  field: { gap: SiftSpacing.space1 },
  fieldLabel: {
    fontFamily: SiftFontFamily.system,
    fontSize: SiftType.label.fontSize,
    letterSpacing: SiftType.label.letterSpacing,
    color: SiftColors.boneDim,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: SiftType.body.fontFamily,
    fontSize: 14,
    paddingHorizontal: SiftSpacing.space3,
  },

  notice: { ...SiftType.annot, color: SiftColors.boneDim, textTransform: 'uppercase' },
  error: { ...SiftType.annot, color: SiftColors.ember },

  forgot: {
    ...SiftType.annot,
    color: SiftColors.boneDim,
    textAlign: 'right',
    textTransform: 'uppercase',
    marginBottom: SiftSpacing.space3,
  },
  swapLine: { ...SiftType.body, color: SiftColors.boneDim, textAlign: 'center' },
  swapAction: { color: SiftColors.bone, textDecorationLine: 'underline' },
});
