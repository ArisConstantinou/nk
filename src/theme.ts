export type ThemePreference = 'system' | 'light' | 'dark';

const storageKey = 'nk-color-theme';
const systemQuery = '(prefers-color-scheme: dark)';
export const themeChangeEvent = 'nk-theme-change';

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

export function getThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia(systemQuery).matches ? 'dark' : 'light';
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, preference);
  } catch {
    // Storage may be blocked; the active page can still use the selected theme.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function watchSystemTheme(onChange: () => void) {
  const media = window.matchMedia(systemQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
