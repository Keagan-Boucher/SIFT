import { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from '@/lib/firebase';

export type AuthPhase = 'demo' | 'loading' | 'ready' | 'error';

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

/**
 * Signs the user in anonymously on launch so a first search needs no account,
 * then lets them attach an email later without losing their saved searches.
 * Firestore rules are per-uid either way, so an anonymous account is a real
 * account as far as ownership is concerned.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<AuthPhase>(isFirebaseConfigured ? 'loading' : 'demo');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      if (next) {
        setPhase('ready');
        writeUserDoc(next).catch(() => {
          // A failed profile write must not block the app; rules still key off the uid.
        });
        return;
      }
      signInAnonymously(auth).catch((cause: Error) => {
        setError(cause.message);
        setPhase('error');
      });
    });

    return unsubscribe;
  }, []);

  return { user, phase, isGuest: !!user?.isAnonymous, error };
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

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await writeUserDoc(result.user);
}

/** Signing out drops straight back to a fresh anonymous session. */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
