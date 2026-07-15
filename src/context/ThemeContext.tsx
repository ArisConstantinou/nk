import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

export type ExperienceTheme = 'flow' | 'tech' | 'studio';

type ThemeApi = {
  darkTheme: boolean;
  experienceTheme: ExperienceTheme;
  setExperienceTheme: (theme: ExperienceTheme) => void;
  toggleDarkTheme: () => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);
const experienceThemes: ExperienceTheme[] = ['flow', 'tech', 'studio'];

function readDarkTheme() {
  const savedTheme = window.localStorage.getItem('nk-color-theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readExperienceTheme(): ExperienceTheme {
  const savedTheme = window.localStorage.getItem('nk-experience-theme');
  return experienceThemes.includes(savedTheme as ExperienceTheme) ? savedTheme as ExperienceTheme : 'flow';
}

export function ThemeProvider({children}: {children: ReactNode}) {
  const [darkTheme, setDarkTheme] = useState(readDarkTheme);
  const [experienceTheme, setExperienceTheme] = useState<ExperienceTheme>(readExperienceTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = darkTheme ? 'dark' : 'light';
    root.style.colorScheme = darkTheme ? 'dark' : 'light';
    window.localStorage.setItem('nk-color-theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => {
    document.documentElement.dataset.experience = experienceTheme;
    window.localStorage.setItem('nk-experience-theme', experienceTheme);
  }, [experienceTheme]);

  const value = useMemo<ThemeApi>(() => ({
    darkTheme,
    experienceTheme,
    setExperienceTheme,
    toggleDarkTheme: () => setDarkTheme(current => !current),
  }), [darkTheme, experienceTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
