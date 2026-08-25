import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from '@/lib/firebase';

export type AuthPhase = 'demo' | 'loading' | 'signedOut' | 'ready' | 'error';

export interface AuthState {
  user: User | null;
  phase: AuthPhase;
  /** True while the account is anonymous, which the settings strip offers to upgrade. */
  isGuest: boolean;
  error: string | null;
}

async function writeUserDoc(user: User): Promise<void> {
  await setDoc(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      isAnonymous: user.isAnonymous,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Watches Firebase auth and nothing else. Signing in is an explicit act on the
 * auth screen — including continuing as a guest — so that the gate has
 * something to gate on. Firestore rules are per-uid either way, so an
 * anonymous account is a real account as far as ownership is concerned.
 */
function useAuthWatcher(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<AuthPhase>(isFirebaseConfigured ? 'loading' : 'demo');

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setPhase(next ? 'ready' : 'signedOut');
      if (next) {
        writeUserDoc(next).catch(() => {
          // A failed profile write must not block the app; rules still key off the uid.
        });
      }
    });
  }, []);

  return useMemo(
    () => ({ user, phase, isGuest: !!user?.isAnonymous, error: null }),
    [user, phase],
  );
}

/** One auth listener for the whole app, mounted at the root layout. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthWatcher();
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** The guest escape on the auth screen: a real anonymous account, no details asked. */
export async function continueAsGuest(): Promise<void> {
  const result = await signInAnonymously(auth);
  await writeUserDoc(result.user);
}

/** Attaches an email and password to the current anonymous account, keeping its uid. */
export async function upgradeGuestToEmail(email: string, password: string): Promise<void> {
  const current = auth.currentUser;
  const credential = EmailAuthProvider.credential(email, password);

  if (current?.isAnonymous) {
    const result = await linkWithCredential(current, credential);
    await writeUserDoc(result.user);
    return;
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  await writeUserDoc(result.user);
}

/**
 * Signing up from the gate. If the visitor already took the guest escape their
 * anonymous uid is kept, so the searches they ran as a guest stay theirs.
 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  await upgradeGuestToEmail(email, password);
  const current = auth.currentUser;
  if (current && name.trim()) {
    await updateProfile(current, { displayName: name.trim() });
    await writeUserDoc(current);
  }
}

/** Firebase sends the reset mail; the app never sees or sets the password itself. */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await writeUserDoc(result.user);
}

/** Signing out drops back to the auth gate rather than a fresh anonymous session. */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
