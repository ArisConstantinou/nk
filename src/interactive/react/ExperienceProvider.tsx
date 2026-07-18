import {createContext, useContext, useMemo, type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {ExperienceRegistry} from '../core/ExperienceRegistry';
import type {ExperienceManifestEntry, ExperienceRoute} from '../core/types';

type ExperienceFrameworkContextValue = Readonly<{
  registry: ExperienceRegistry;
  route: ExperienceRoute;
}>;

const ExperienceFrameworkContext = createContext<ExperienceFrameworkContextValue | null>(null);

export function ExperienceProvider({manifest, children}: {manifest: readonly ExperienceManifestEntry[]; children: ReactNode}) {
  const location = useLocation();
  const registry = useMemo(() => new ExperienceRegistry(manifest), [manifest]);
  const value = useMemo<ExperienceFrameworkContextValue>(() => ({
    registry,
    route: {pathname: location.pathname, search: location.search},
  }), [location.pathname, location.search, registry]);
  return <ExperienceFrameworkContext.Provider value={value}>{children}</ExperienceFrameworkContext.Provider>;
}

export function useExperienceFramework() {
  const value = useContext(ExperienceFrameworkContext);
  if (!value) throw new Error('ExperienceSlot must be rendered inside ExperienceProvider.');
  return value;
}
