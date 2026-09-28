/**
 * Storefront catalogue helpers: device renders, family styling, clean model URLs.
 * Pure functions — safe in Server and Client Components.
 */
import type { CategoryDTO, DeviceFamilyDTO, DeviceModelDTO } from '@unibody/shared';
import { PUBLIC_API_URL } from '@/lib/config';

export const render = (name: string) => `${PUBLIC_API_URL}/static/renders/${name}.webp`;

export const HERO_RENDER = render('hero_laptop_midnight');

interface FamilyLook {
  render: string;
  /** Tinted stage utility */
  tint: string;
  /** Vivid dot colour for chips */
  dot: string;
  /** Dark "stage" (e.g. MacBook Pro on black like the Figma) */
  dark?: boolean;
  blurb: string;
}

const FAMILY_LOOK: Record<string, FamilyLook> = {
  'macbook-air': { render: render('laptop_starlight'), tint: 'bg-tint-sand', dot: 'bg-vivid-orange', blurb: '11", 13" & 15" · 2012 → M4' },
  'macbook-pro': { render: render('laptop_spaceblack'), tint: 'bg-hero', dot: 'bg-vivid-indigo', dark: true, blurb: '13", 14", 15" & 16" · 2012 → M4' },
  imac: { render: render('aio_blue'), tint: 'bg-tint-sky', dot: 'bg-vivid-blue', blurb: '21.5", 24" & 27"' },
  iphone: { render: render('phone_titanium'), tint: 'bg-tint-blush', dot: 'bg-vivid-pink', blurb: 'iPhone 11 → 16' },
  ipad: { render: render('tablet_purple'), tint: 'bg-tint-lavender', dot: 'bg-vivid-purple', blurb: 'iPad · Air · Pro' },
  accessories: { render: render('charger'), tint: 'bg-tint-peach', dot: 'bg-vivid-green', blurb: 'Chargers · cables' },
  macbook: { render: render('laptop_silver'), tint: 'bg-tint-graphite', dot: 'bg-vivid-teal', blurb: '12" Retina · 2015–2017' },
};
const DEFAULT_LOOK: FamilyLook = { render: render('laptop_silver'), tint: 'bg-tint-graphite', dot: 'bg-vivid-teal', blurb: '' };
export const familyLook = (slug?: string | null): FamilyLook => (slug && FAMILY_LOOK[slug]) || DEFAULT_LOOK;

const CATEGORY_RENDER: Record<string, string> = {
  display: 'display_spacegrey',
  keyboard: 'keycaps',
  battery: 'battery',
  cpu: 'logicboard',
  charger: 'charger',
  trackpad: 'trackpad',
  fan: 'fan',
  ssd: 'ssd',
  speaker: 'speakers',
  camera: 'camera',
  laptop: 'laptop_silver',
  cable: 'charger',
  box: 'keycaps',
};
export const categoryRender = (c: Pick<CategoryDTO, 'icon' | 'slug'>) => render(c.slug === 'top-case' ? 'topcase_spacegrey' : CATEGORY_RENDER[c.icon] ?? 'keycaps');

/** Shorter, friendlier names for category pills/tiles. */
const CATEGORY_SHORT: Record<string, string> = {
  'display-assembly': 'Displays',
  'lcd-panel': 'LCD panels',
  'display-parts': 'Bezels & hinges',
  'top-case': 'Top case & keyboard',
  keyboard: 'Keyboards',
  trackpad: 'Trackpads',
  battery: 'Batteries',
  'logic-board': 'Logic boards',
  storage: 'Storage',
  'io-board': 'I/O boards',
  chargers: 'Chargers',
  thermal: 'Fans & thermal',
  audio: 'Speakers',
  camera: 'Cameras',
  housing: 'Housing',
  'small-parts': 'Small parts',
};
export const categoryShort = (c: Pick<CategoryDTO, 'slug' | 'name'>) => CATEGORY_SHORT[c.slug] ?? c.name;

// ---------------------------------------------------------------- models
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/["”″]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** '13" M1' + A2337 → '13-m1-a2337' — readable, stable, unique within a family. */
export const modelSlug = (m: Pick<DeviceModelDTO, 'name' | 'aNumbers'>) => [slugify(m.name), (m.aNumbers[0] ?? '').toLowerCase()].filter(Boolean).join('-');

export const modelHref = (m: Pick<DeviceModelDTO, 'name' | 'aNumbers' | 'familySlug'>) => `/d/${m.familySlug}/${modelSlug(m)}`;

export function findModelBySlug(models: DeviceModelDTO[], slug: string): DeviceModelDTO | undefined {
  const s = slug.toLowerCase();
  return models.find((m) => modelSlug(m) === s || m.id === s) ?? models.find((m) => m.aNumbers.some((a) => a.toLowerCase() === s));
}

/** 'MacBook Air 13" M1' */
export const modelShort = (m: Pick<DeviceModelDTO, 'familyName' | 'name'>) =>
  m.familyName === 'Accessories' || m.name.toLowerCase().startsWith(m.familyName.toLowerCase().split(' ')[0]) ? m.name : `${m.familyName.replace(/ \(.*\)$/, '')} ${m.name}`;

export const isANumber = (q: string) => /^a\d{4}$/i.test(q.trim());

export const NAV_FAMILIES: { slug: string; label: string }[] = [
  { slug: 'macbook-air', label: 'MacBook Air' },
  { slug: 'macbook-pro', label: 'MacBook Pro' },
  { slug: 'imac', label: 'iMac' },
  { slug: 'iphone', label: 'iPhone' },
  { slug: 'ipad', label: 'iPad' },
  { slug: 'accessories', label: 'Accessories' },
];

/** Popular models across families = most parts in stock. */
export function popularModels(families: DeviceFamilyDTO[], n = 10): DeviceModelDTO[] {
  return families
    .flatMap((f) => f.models ?? [])
    .filter((m) => (m.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
    .slice(0, n);
}

export const waLink = (number: string, text?: string) => `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
