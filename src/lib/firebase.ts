import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
// @ts-expect-error - only exported from firebase/auth's React Native build; Metro resolves it via the "react-native" export condition, tsc does not
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * With no project configured the app still launches, with nothing behind the
 * screens, rather than failing outright. It is the honest signal for which
 * mode the UI is in, and the account panel says so in words.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

/**
 * A device on the same network cannot reach the emulator on localhost, so fall
 * back to the host Expo is being served from.
 */
function emulatorHost(): string {
  if (Platform.OS === 'web') return '127.0.0.1';
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  return hostUri?.split(':')[0] ?? '127.0.0.1';
}

/**
 * Placeholder values so initialisation never throws in demo mode. Nothing in
 * demo mode ever calls the SDK, so these are never sent anywhere.
 */
const resolvedConfig = isFirebaseConfigured
  ? firebaseConfig
  : { ...firebaseConfig, apiKey: 'demo-api-key', projectId: 'sift-demo', appId: 'demo-app-id' };

export const app = getApps().length ? getApp() : initializeApp(resolvedConfig);

/** Web has no AsyncStorage persistence option; it uses the SDK default. */
export const auth: Auth =
  Platform.OS === 'web'
    ? initializeAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db = getFirestore(app);
/** Must match setGlobalOptions in functions/src/index.ts, or callables 404. */
export const functions = getFunctions(app, 'africa-south1');

if (useEmulator) {
  const host = emulatorHost();
  // A device can only reach the emulator over the LAN. Tunnelled or web-only
  // hosts resolve to something it cannot open a socket to, and the failure
  // mode is a silent hang rather than an error, so say where we are pointing.
  console.log(`[sift] using Firebase emulators at ${host} (auth 9099, firestore 8080, functions 5001)`);
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
}
