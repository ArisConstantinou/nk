import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {defaultContent} from '../content';
import type {SiteContent} from '../types';

const STORAGE_KEY = 'nk-electrical-content-v2';

type ContentApi = {
  content: SiteContent;
  setContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  reset: () => void;
  exportContent: () => void;
  importContent: (file: File) => Promise<void>;
};

const ContentContext = createContext<ContentApi | null>(null);

const mergeContent = (value: Partial<SiteContent>): SiteContent => ({
  ...defaultContent,
  ...value,
  heroObject: {...defaultContent.heroObject, ...value.heroObject},
  themeContent: {
    tech: {...defaultContent.themeContent.tech, ...value.themeContent?.tech},
  },
});

const readStored = (): SiteContent => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return defaultContent;
    const parsed = JSON.parse(value) as Partial<SiteContent>;
    const merged = mergeContent(parsed);
    if (parsed.themeContent?.tech?.heroBody === 'Planning, installation, lighting, appliances and smart control from one experienced electrical team in Cyprus.') {
      merged.themeContent.tech = defaultContent.themeContent.tech;
    }
    return merged;
  } catch {
    return defaultContent;
  }
};

export function ContentProvider({children}: {children: ReactNode}) {
  const [content, setContent] = useState<SiteContent>(readStored);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(content)), [content]);

  const api = useMemo<ContentApi>(() => ({
    content,
    setContent,
    reset: () => {
      localStorage.removeItem(STORAGE_KEY);
      setContent(defaultContent);
    },
    exportContent: () => {
      const blob = new Blob([JSON.stringify(content, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nk-electrical-content.json';
      link.click();
      URL.revokeObjectURL(url);
    },
    importContent: async (file) => {
      const next = JSON.parse(await file.text()) as SiteContent;
      if (!next.heroTitle || !Array.isArray(next.products)) throw new Error('This is not a valid NK content file.');
      setContent(mergeContent(next));
    },
  }), [content]);

  return <ContentContext.Provider value={api}>{children}</ContentContext.Provider>;
}

export const useContent = () => {
  const value = useContext(ContentContext);
  if (!value) throw new Error('useContent must be used inside ContentProvider');
  return value;
};
