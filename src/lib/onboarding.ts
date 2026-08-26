import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local, not per-account: the tour teaches the app rather than anything
 * about the user, so a second account on the same phone has already seen it,
 * and it still works in demo mode where there is no Firestore to write to.
 */
const KEY = 'sift.tour.seen';

export async function hasSeenTour(): Promise<boolean> {
  // Storage failing is not worth a crash on launch; showing the tour again is the safe miss.
  return AsyncStorage.getItem(KEY).then((value) => value === '1').catch(() => false);
}

export async function markTourSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1').catch(() => {});
}

/** Backs the REPLAY TOUR line in the account panel. */
export async function clearTourSeen(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
