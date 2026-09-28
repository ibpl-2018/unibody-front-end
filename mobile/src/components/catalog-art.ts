import { renderUrl } from '@/lib/config';
import type { IconName } from './ui';

/** Category icon key -> transparent render shown on "Shop by part" tiles. */
export const CATEGORY_RENDER: Record<string, string> = {
  display: 'display_spacegrey',
  keyboard: 'topcase_silver',
  battery: 'battery',
  cpu: 'logicboard',
  ssd: 'ssd',
  cable: 'charger',
  charger: 'charger',
  fan: 'fan',
  speaker: 'speakers',
  camera: 'camera',
  trackpad: 'trackpad',
  laptop: 'laptop_silver',
};
export const categoryRender = (icon: string) => (CATEGORY_RENDER[icon] ? renderUrl(CATEGORY_RENDER[icon]) : null);

export const CATEGORY_ICON: Record<string, IconName> = {
  display: 'tv-outline',
  keyboard: 'keypad-outline',
  battery: 'battery-half-outline',
  cpu: 'hardware-chip-outline',
  ssd: 'save-outline',
  cable: 'git-commit-outline',
  charger: 'flash-outline',
  fan: 'sync-outline',
  speaker: 'volume-high-outline',
  camera: 'camera-outline',
  trackpad: 'square-outline',
  laptop: 'laptop-outline',
  box: 'cube-outline',
};

/** Family slug -> hero render + stage tint + icon for device tiles. */
export const FAMILY_ART: Record<string, { render: string; tint: 'sand' | 'graphite' | 'sky' | 'blush' | 'lavender' | 'mint' | 'peach'; dark?: boolean; icon: IconName }> = {
  'macbook-air': { render: 'laptop_starlight', tint: 'sand', icon: 'laptop-outline' },
  'macbook-pro': { render: 'laptop_spaceblack', tint: 'graphite', dark: true, icon: 'laptop-outline' },
  imac: { render: 'aio_blue', tint: 'sky', icon: 'desktop-outline' },
  macbook: { render: 'laptop_silver', tint: 'lavender', icon: 'laptop-outline' },
  iphone: { render: 'phone_titanium', tint: 'blush', icon: 'phone-portrait-outline' },
  ipad: { render: 'tablet_purple', tint: 'lavender', icon: 'tablet-portrait-outline' },
  accessories: { render: 'charger', tint: 'peach', icon: 'flash-outline' },
};
export const familyArt = (slug: string) => FAMILY_ART[slug] ?? { render: 'laptop_silver', tint: 'graphite' as const, icon: 'laptop-outline' as IconName };
