import type {ExperienceCleanup, InputCapabilities, ViewportSnapshot} from './types';

export const getViewportSnapshot = (): ViewportSnapshot => ({
  width: window.innerWidth,
  height: window.innerHeight,
  devicePixelRatio: Math.min(window.devicePixelRatio || 1, 3),
  orientation: window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait',
});

export const getInputCapabilities = (): InputCapabilities => ({
  coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  hover: window.matchMedia('(hover: hover)').matches,
});

export function watchMedia(query: string, listener: (matches: boolean) => void, signal?: AbortSignal): ExperienceCleanup {
  const media = window.matchMedia(query);
  const onChange = (event: MediaQueryListEvent) => listener(event.matches);
  media.addEventListener('change', onChange, signal ? {signal} : undefined);
  listener(media.matches);
  return () => media.removeEventListener('change', onChange);
}

export function observeDocumentVisibility(listener: (visible: boolean) => void, signal?: AbortSignal): ExperienceCleanup {
  const onChange = () => listener(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', onChange, signal ? {signal} : undefined);
  onChange();
  return () => document.removeEventListener('visibilitychange', onChange);
}
