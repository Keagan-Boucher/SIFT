import Svg, { Path } from 'react-native-svg';

import { SiftColors } from '@/constants/sift-theme';

/** Filled, hard-edged glyphs on a 24 unit grid. One style across the set: solid paths, no strokes. */
const PATHS = {
  back: 'M10 4.5 2.5 12 10 19.5l2.1-2.1-3.9-3.9H21.5v-3H8.2l3.9-3.9z',
  arrow: 'M14 4.5 21.5 12 14 19.5l-2.1-2.1 3.9-3.9H2.5v-3h13.3l-3.9-3.9z',
  bookmark: 'M5 2h14v20l-7-5-7 5z',
  sliders: 'M2 5h20v3H2zM2 16h20v3H2zM14 2h3v9h-3zM7 13h3v9H7z',
  tick: 'M9.5 15.6 4.4 10.5 2.3 12.6l7.2 7.2L21.7 7.6l-2.1-2.1z',
  plus: 'M10.5 3h3v7.5H21v3h-7.5V21h-3v-7.5H3v-3h7.5z',
  alert: 'M12 2.5 23 21.5H1z',
  bell: 'M5 17V10a7 7 0 0 1 14 0v7l2 2v1H3v-1zM9.5 21h5a2.5 2.5 0 0 1-5 0z',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 12, color = SiftColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} fill={color} />
    </Svg>
  );
}
