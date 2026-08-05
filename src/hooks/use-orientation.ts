import { useWindowDimensions } from 'react-native';

export type Orientation = 'landscape' | 'portrait';

/** SIFT's screens are landscape-primary, portrait-derived — pick layout from actual window shape. */
export function useOrientation(): Orientation {
  const { width, height } = useWindowDimensions();
  return width >= height ? 'landscape' : 'portrait';
}
