/**
 * SIFT / Readout design tokens.
 * Ported from the Claude Design system project `Sift Design System`
 * (tokens/colors.css, typography.css, spacing.css, motion.css, matrix.css).
 * Every SIFT component and screen should source values from here rather
 * than hardcoding hex/px — this file is the single source of truth.
 */

export const SiftColors = {
  // neutrals
  void: '#0E1012',
  carbon: '#191C1F',
  slate: '#24282B',
  graphite: '#333A3E',
  bone: '#E9EBEA',
  boneDim: '#7D8489',
  paper: '#B9BDBF',
  paperHi: '#D6D9DA',
  // signals
  mint: '#3FE383',
  acid: '#C8F03C',
  ember: '#F0552E',
  current: '#3A7BD5',
  // semantic aliases
  onSignal: '#0E1012',
  onLight: '#0E1012',
} as const;

export const SiftTier: Record<1 | 2 | 3 | 4 | 5 | 'unresolved', string> = {
  1: SiftColors.mint,
  2: SiftColors.mint,
  3: SiftColors.paperHi,
  4: SiftColors.ember,
  5: SiftColors.current,
  unresolved: SiftColors.graphite,
};

export const SiftSigilColor: Record<'//' | '>' | '!' | '?', string> = {
  '//': SiftColors.mint,
  '>': SiftColors.acid,
  '!': SiftColors.ember,
  '?': SiftColors.current,
};

export const SiftSpacing = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 24,
  space6: 32,
  space7: 48,
  gridGutter: 16,
  gridMarginTrailing: 24,
  gridMarginLeading: 56,
  railWidth: 56,
  promptBarHeight: 36,
  stripHeight: 18,
  stripGlyph: 12,
  stripIndicator: 4,
} as const;

/** Zero corner radius everywhere — a hard design-system rule, never overridden. */
export const SiftRadius = 0;

export const SiftFontFamily = {
  display: 'BigShouldersDisplay_800ExtraBold',
  displayBold: 'BigShouldersDisplay_700Bold',
  system: 'JetBrainsMono_400Regular',
  systemBold: 'JetBrainsMono_700Bold',
  longform: 'Archivo_400Regular',
  longformMedium: 'Archivo_500Medium',
} as const;

export const SiftType = {
  displayL: { fontFamily: SiftFontFamily.display, fontSize: 30, lineHeight: 28, letterSpacing: -0.45 },
  displayM: { fontFamily: SiftFontFamily.displayBold, fontSize: 20, lineHeight: 20, letterSpacing: -0.2 },
  priceL: { fontFamily: SiftFontFamily.systemBold, fontSize: 24, lineHeight: 26, letterSpacing: -0.24 },
  priceM: { fontFamily: SiftFontFamily.systemBold, fontSize: 16, lineHeight: 20, letterSpacing: -0.08 },
  body: { fontFamily: SiftFontFamily.longform, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  title: { fontFamily: SiftFontFamily.longformMedium, fontSize: 14, lineHeight: 19, letterSpacing: 0 },
  label: { fontFamily: SiftFontFamily.systemBold, fontSize: 11, lineHeight: 12, letterSpacing: 0.88 },
  annot: { fontFamily: SiftFontFamily.system, fontSize: 9, lineHeight: 11, letterSpacing: 0.9 },
} as const;

export const SiftMotion = {
  durationInstant: 90,
  durationSnap: 160,
  durationSweep: 320,
  durationSequence: 640,
  easeEntry: [0.2, 0, 0, 1] as [number, number, number, number],
} as const;

export const SiftMatrix = {
  lo: { pitch: 12, dot: 1.5, color: SiftColors.graphite, opacity: 1 },
  mid: { pitch: 8, dot: 2, color: SiftColors.graphite, opacity: 1 },
  hi: { pitch: 4, dot: 2, color: SiftColors.boneDim, opacity: 0.3 },
} as const;
