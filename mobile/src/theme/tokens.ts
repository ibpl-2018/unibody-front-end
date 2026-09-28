import type { Tone } from '@/shared';

export type Scheme = 'light' | 'dark';
export type ThemePreference = Scheme | 'system';

export const TINT_NAMES = ['sky', 'lavender', 'mint', 'blush', 'peach', 'teal', 'lemon', 'sand', 'graphite'] as const;
export type TintName = (typeof TINT_NAMES)[number];

const light = {
  bg: '#ffffff',
  surface: '#ffffff',
  surface2: '#f5f5f7',
  fg: '#1d1d1f',
  muted: '#6e6e73',
  subtle: '#86868b',
  line: '#d2d2d7',
  lineSubtle: '#e8e8ed',
  accent: '#0071e3',
  accentSoft: '#e8f3ff',
  onAccent: '#ffffff',
  link: '#0066cc',
  success: '#248a3d',
  successSoft: '#e7f8ee',
  warning: '#b25000',
  warningSoft: '#fff2e5',
  danger: '#d70015',
  dangerSoft: '#ffeef2',
  purple: '#8944ab',
  purpleSoft: '#f4ecfb',
  hero: '#000000',
  heroSurface: '#161617',
  heroFg: '#f5f5f7',
  heroMuted: '#a1a1a6',
  inverse: '#1d1d1f',
  onInverse: '#ffffff',
  overlay: 'rgba(0,0,0,0.4)',
  tabBar: 'rgba(255,255,255,0.96)',
  shadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06)',
  tint: {
    sky: '#e8f3ff',
    lavender: '#f0edff',
    mint: '#e7f8ee',
    blush: '#ffeef2',
    peach: '#fff2e5',
    teal: '#e4f6f9',
    lemon: '#fff8db',
    sand: '#f6f1ea',
    graphite: '#ededf0',
  } as Record<TintName, string>,
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#000000',
  surface: '#161617',
  surface2: '#1d1d1f',
  fg: '#f5f5f7',
  muted: '#a1a1a6',
  subtle: '#86868b',
  line: '#3a3a3c',
  lineSubtle: '#2c2c2e',
  accent: '#2997ff',
  accentSoft: '#0f1f33',
  onAccent: '#ffffff',
  link: '#2997ff',
  success: '#30d158',
  successSoft: '#0f2519',
  warning: '#ff9f0a',
  warningSoft: '#2e1f12',
  danger: '#ff453a',
  dangerSoft: '#2e141b',
  purple: '#bf5af2',
  purpleSoft: '#1a1730',
  hero: '#000000',
  heroSurface: '#161617',
  heroFg: '#f5f5f7',
  heroMuted: '#a1a1a6',
  inverse: '#f5f5f7',
  onInverse: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(22,22,23,0.96)',
  shadow: '0 0 0 1px rgba(255,255,255,0.06)',
  tint: {
    sky: '#0f1f33',
    lavender: '#1a1730',
    mint: '#0f2519',
    blush: '#2e141b',
    peach: '#2e1f12',
    teal: '#0e2529',
    lemon: '#2b2610',
    sand: '#26221c',
    graphite: '#232326',
  },
};

export const PALETTES: Record<Scheme, Palette> = { light, dark };

export const VIVID = {
  blue: '#0071e3',
  indigo: '#5856d6',
  purple: '#af52de',
  pink: '#ff2d55',
  orange: '#ff9500',
  yellow: '#ffcc00',
  green: '#28cd41',
  teal: '#30b0c7',
  mint: '#00c7be',
};

export const GRADIENTS = {
  brand: ['#5856d6', '#af52de', '#ff2d55'] as const,
  aurora: ['#0071e3', '#5856d6', '#af52de'] as const,
  sunrise: ['#ff9500', '#ff2d55', '#af52de'] as const,
  fresh: ['#00c7be', '#30b0c7', '#0071e3'] as const,
};

export const RADIUS = { sm: 10, md: 14, card: 18, lg: 24, pill: 999 };
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 16 };

/** Category icon key -> stage tint, mirrors web `tintFor`. */
const ICON_TINT: Record<string, TintName> = {
  display: 'sky',
  keyboard: 'lavender',
  battery: 'mint',
  cpu: 'blush',
  charger: 'peach',
  trackpad: 'graphite',
  fan: 'teal',
  ssd: 'lemon',
  speaker: 'graphite',
  camera: 'lavender',
  laptop: 'sand',
  cable: 'peach',
  box: 'sand',
};
export function tintFor(key?: string | null): TintName {
  if (key && ICON_TINT[key]) return ICON_TINT[key];
  const sum = [...(key ?? 'x')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return TINT_NAMES[Math.abs(sum) % TINT_NAMES.length];
}

export function toneColors(p: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'success':
      return { fg: p.success, bg: p.successSoft };
    case 'info':
      return { fg: p.accent, bg: p.accentSoft };
    case 'purple':
      return { fg: p.purple, bg: p.purpleSoft };
    case 'warning':
      return { fg: p.warning, bg: p.warningSoft };
    case 'danger':
      return { fg: p.danger, bg: p.dangerSoft };
    default:
      return { fg: p.muted, bg: p.surface2 };
  }
}
