// design tokens for calilog.
// dark-mode first with high contrast and large tap targets.

export const Colors = {
  // backgrounds
  bg: '#000000',          // deepest background
  surface: '#1c1c1e',     // cards, panels
  surfaceRaised: '#2c2c2e', // elevated cards
  border: '#38383a',      // subtle separators

  // accent colors
  primary: '#ffffff',     // white — primary actions, highlights
  primaryDim: '#ffffff15', // white with low opacity (backgrounds)
  primaryDark: '#e5e5ea', // grey for pressed states

  // semantic colors
  success: '#3fb950',     // keep green for success/met targets
  successDim: '#3fb95020',
  warning: '#f0a832',     // keep amber for quality check/warnings
  warningDim: '#f0a83220',
  danger: '#f85149',      // keep red for delete/destructive
  dangerDim: '#f8514920',

  // text colors
  textPrimary: '#ffffff',   // main text
  textSecondary: '#8e8e93', // muted / label text
  textDisabled: '#48484a',  // placeholder / disabled

  // streak indicator dots
  streakFilled: '#ffffff',
  streakEmpty: '#38383a',

  // rest timer colors
  timerActive: '#ffffff',
  timerAlarm: '#f85149',
} as const;

export const Typography = {
  // sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  hero: 42,

  // weights (must be valid rn font weights)
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

// min tap target (48dp) as per accessibility standards. important for sweaty hands
export const MIN_TAP_TARGET = 48;
export const SET_ROW_HEIGHT = 56;
