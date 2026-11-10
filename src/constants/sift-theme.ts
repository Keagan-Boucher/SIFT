/**
 * SIFT design tokens, from the "Screen preview v2" page of the SIFT Figma file.
 *
 * Acid is the one primary action on a screen. Mint is the app reporting what it
 * found or finished. Ember is breakage and nothing else. Everything else is the
 * grey ramp. No gradients, no glows, no coloured shadows.
 */

export const SiftColors = {
  canvas: '#0A0A0C',
  surface: '#141416',
  surfaceHi: '#1A1A1D',
  hairline: 'rgba(255,255,255,0.09)',
  text: '#ECEDEB',
  textDim: '#9A9C9A',
  textMute: '#6E7271',
  acid: '#C8F03C',
  mint: '#3FE383',
  ember: '#F0552E',
  onAccent: '#0A0A0C',
  /** Empty tracker segments and meter tracks. */
  track: '#2A2B2E',
  /** Unhighlighted meter fill: white at 30%. */
  meterRest: 'rgba(255,255,255,0.3)',
} as const;

/** Every surface, control and bar. Only device chrome and OS notifications differ. */
export const SiftRadius = 3;

export const SiftSpacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 32 } as const;

export const SiftFontFamily = {
  display: 'BigShouldersDisplay_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
  prose: 'Archivo_400Regular',
  proseMedium: 'Archivo_500Medium',
} as const;

export const SiftType = {
  /** Screen titles. Uppercase, tight. */
  title: { fontFamily: SiftFontFamily.display, fontSize: 40, lineHeight: 36, letterSpacing: 1, textTransform: 'uppercase' },
  /** Uppercase mono labels: step counts, section labels, meta. */
  label: { fontFamily: SiftFontFamily.mono, fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  labelBold: { fontFamily: SiftFontFamily.monoBold, fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  /** Domains and other data read as identifiers. */
  data: { fontFamily: SiftFontFamily.mono, fontSize: 13, lineHeight: 18 },
  price: { fontFamily: SiftFontFamily.monoBold, fontSize: 18, lineHeight: 22 },
  /** Sentences and product titles. */
  body: { fontFamily: SiftFontFamily.prose, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: SiftFontFamily.prose, fontSize: 11.5, lineHeight: 16 },
} as const;
