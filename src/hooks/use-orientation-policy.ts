import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * SIFT is designed landscape-first: the comparison grid, the price ladder and
 * the spread dashboard all want horizontal space. Every view also has a portrait
 * layout, so the app allows rotation rather than locking, and useOrientation
 * picks the layout from the actual window shape.
 */
export function useOrientationPolicy() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.unlockAsync();
  }, []);
}
