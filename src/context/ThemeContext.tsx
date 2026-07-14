import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

type ThemeApi = {
  darkTheme: boolean;
  electricalTheme: boolean;
  toggleDarkTheme: () => void;
  toggleElectricalTheme: () => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);

function readDarkTheme() {
  const savedTheme = window.localStorage.getItem('nk-color-theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readElectricalTheme() {
  const savedTheme = window.localStorage.getItem('nk-experience-theme');
  return savedTheme ? savedTheme === 'tech' : true;
}

export function ThemeProvider({children}: {children: ReactNode}) {
  const [darkTheme, setDarkTheme] = useState(readDarkTheme);
  const [electricalTheme, setElectricalTheme] = useState(readElectricalTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = darkTheme ? 'dark' : 'light';
    root.style.colorScheme = darkTheme ? 'dark' : 'light';
    window.localStorage.setItem('nk-color-theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => {
    document.documentElement.dataset.experience = electricalTheme ? 'tech' : 'studio';
    window.localStorage.setItem('nk-experience-theme', electricalTheme ? 'tech' : 'studio');
  }, [electricalTheme]);

  const value = useMemo<ThemeApi>(() => ({
    darkTheme,
    electricalTheme,
    toggleDarkTheme: () => setDarkTheme(current => !current),
    toggleElectricalTheme: () => setElectricalTheme(current => !current),
  }), [darkTheme, electricalTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
