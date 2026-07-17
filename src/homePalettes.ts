export const homePaletteOptions = [
  {
    id: 'electric-cyan', number: '01', code: 'PAL-01', label: 'Electric clarity', context: 'Signature lighting',
    image: '', alt: 'Architectural lighting installation in Cyprus', route: '/services/lighting-design',
    detail: 'Clean cyan, cool blue and violet accents for a precise technical atmosphere.',
    colors: ['#67E8F9', '#8B7CFF', '#F6F9FF', '#17243A', '#0C1220'],
  },
  {
    id: 'amber-glow', number: '02', code: 'PAL-02', label: 'Amber glow', context: 'Hospitality warmth',
    image: 'assets/generated/hospitality-project.webp', alt: 'Warm hospitality lighting project', route: '/projects',
    detail: 'Warm amber, clay and cream tones that make hospitality spaces feel inviting.',
    colors: ['#F2B35D', '#D96C4A', '#FFF4DF', '#493329', '#17120F'],
  },
  {
    id: 'olive-calm', number: '03', code: 'PAL-03', label: 'Olive calm', context: 'Residential comfort',
    image: 'assets/generated/residence-project.webp', alt: 'Calm residential electrical and lighting design', route: '/services/electrical-installations',
    detail: 'Soft olive, mineral green and sand for calm residential environments.',
    colors: ['#A8C28F', '#5E806F', '#F2F0E6', '#34463D', '#111815'],
  },
  {
    id: 'coral-energy', number: '04', code: 'PAL-04', label: 'Coral energy', context: 'Retail impact',
    image: 'assets/generated/retail-project.webp', alt: 'Colourful retail lighting installation', route: '/shop/lighting',
    detail: 'Coral, apricot and electric violet for retail spaces that need energy and focus.',
    colors: ['#FF7763', '#FFB45E', '#FFF0EA', '#7C67E8', '#21141B'],
  },
  {
    id: 'boardroom-blue', number: '05', code: 'PAL-05', label: 'Boardroom blue', context: 'Commercial precision',
    image: 'assets/projects/boardroom-installation.webp', alt: 'Professional boardroom electrical installation', route: '/projects',
    detail: 'Deep blue, steel and ice for focused commercial and corporate spaces.',
    colors: ['#68B8E8', '#466C9A', '#EEF6FF', '#223653', '#0B1320'],
  },
] as const;

export type HomePaletteId = typeof homePaletteOptions[number]['id'];

const storageKey = 'nk-home-palette';
export const homePaletteChangeEvent = 'nk-home-palette-change';

const isHomePaletteId = (value: string | null): value is HomePaletteId =>
  homePaletteOptions.some(option => option.id === value);

export function getHomePalette(): HomePaletteId {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isHomePaletteId(stored) ? stored : homePaletteOptions[0].id;
  } catch {
    return homePaletteOptions[0].id;
  }
}

export function applyHomePalette(palette: HomePaletteId) {
  document.documentElement.dataset.homePalette = palette;
}

export function saveHomePalette(palette: HomePaletteId) {
  try { window.localStorage.setItem(storageKey, palette); } catch { /* The page can still use the active selection. */ }
  applyHomePalette(palette);
  window.dispatchEvent(new Event(homePaletteChangeEvent));
}
