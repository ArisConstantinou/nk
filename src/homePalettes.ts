export const homePaletteOptions = [
  {
    id: 'nk-copper', number: '01', code: 'NK-01', label: 'Copper current', context: 'NK Electrical signature',
    image: 'assets/generated/hospitality-project.webp', alt: 'Warm hospitality lighting project', route: '/projects',
    detail: 'Graphite, warm copper, brass and mineral ivory create one consistent professional identity.',
    colors: ['#E06B4D', '#D8A467', '#F2EEE6', '#17343A', '#11191C'],
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
