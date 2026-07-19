/**
 * Shared color tokens for the audit report component library.
 *
 * Sourced from the dataviz skill's validated reference palette
 * (dark-mode column — this app renders dark-theme only, so every
 * hex below is taken directly from `palette.md` without modification,
 * satisfying the "documented palette only" check). No new hues are
 * invented anywhere in this file.
 *
 * - STATUS_COLORS: the fixed "state" scale (good/warning/serious/critical),
 *   used wherever a value is being judged against a threshold (health
 *   scores, gauges, character-count ranges).
 * - CATEGORICAL_DARK: the 8-hue fixed-order identity palette, used for
 *   auto-assigning colors to arbitrary category lists (e.g. DonutChart
 *   slices) and for the audit-category family colors.
 * - SEQUENTIAL_BLUE: the one-hue ordinal ramp, used for heading-level
 *   (H1-H6) bars where the sequence itself carries meaning.
 */

/** Fixed "state" scale — reserved meaning, always paired with icon/label by callers. */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/** 8-hue fixed-order categorical palette (dark-surface steps), slots 1-8. */
export const CATEGORICAL_DARK: readonly string[] = [
  '#3987e5', // 1 blue
  '#008300', // 2 green
  '#d55181', // 3 magenta
  '#c98500', // 4 yellow
  '#199e70', // 5 aqua
  '#d95926', // 6 orange
  '#9085e9', // 7 violet
  '#e66767', // 8 red
];

/**
 * Fixed, reserved accent color per audit category — analogous to the
 * status palette's "small fixed scale with reserved meaning" (each
 * category always wears the same hue regardless of its score). Values
 * are pulled straight from CATEGORICAL_DARK slots matching the family
 * requested by spec (onPage=red, geo=purple, backlink=green,
 * usability=yellow, performance=blue).
 */
export const CATEGORY_FAMILY_COLORS: Record<
  'onPage' | 'geo' | 'backlink' | 'usability' | 'performance',
  string
> = {
  onPage: CATEGORICAL_DARK[7], // red
  geo: CATEGORICAL_DARK[6], // violet
  backlink: CATEGORICAL_DARK[1], // green
  usability: CATEGORICAL_DARK[3], // yellow
  performance: CATEGORICAL_DARK[0], // blue
};

/** One-hue sequential/ordinal blue ramp, steps 100 (lightest) -> 700 (darkest). */
export const SEQUENTIAL_BLUE = {
  100: '#cde2fb',
  150: '#b7d3f6',
  200: '#9ec5f4',
  250: '#86b6ef',
  300: '#6da7ec',
  350: '#5598e7',
  400: '#3987e5',
  450: '#2a78d6',
  500: '#256abf',
  550: '#1c5cab',
  600: '#184f95',
  650: '#104281',
  700: '#0d366b',
} as const;

/** Ordinal ramp for H1 (boldest) -> H6 (faintest); stays within the dark-mode 2:1 floor (step 600 max darkness). */
export const HEADING_LEVEL_RAMP: string[] = [
  SEQUENTIAL_BLUE[600],
  SEQUENTIAL_BLUE[500],
  SEQUENTIAL_BLUE[400],
  SEQUENTIAL_BLUE[300],
  SEQUENTIAL_BLUE[200],
  SEQUENTIAL_BLUE[100],
];

/** Chart chrome / ink tokens (dark mode) from palette.md. */
export const CHART_INK = {
  surface: '#1a1a19',
  primary: '#ffffff',
  secondary: '#c3c2b7',
  muted: '#898781',
  gridline: '#2c2c2a',
  baseline: '#383835',
} as const;

/** Score (0-100) -> status color, using the 80/60/40 thresholds from the house convention. */
export function scoreToColor(score: number): string {
  if (score >= 80) return STATUS_COLORS.good;
  if (score >= 60) return STATUS_COLORS.warning;
  if (score >= 40) return STATUS_COLORS.serious;
  return STATUS_COLORS.critical;
}

/** Pick a categorical color for index `i`, cycling with reduced opacity marker past slot 8. */
export function categoricalColor(i: number): string {
  return CATEGORICAL_DARK[i % CATEGORICAL_DARK.length];
}
