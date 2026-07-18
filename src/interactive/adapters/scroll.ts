import {RafFrameScheduler} from '../core/frameScheduler';
import type {ExperienceCleanup, FrameScheduler} from '../core/types';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export interface ScrollProgressOptions {
  element: Element;
  onProgress: (progress: number) => void;
  scheduler?: FrameScheduler;
  signal?: AbortSignal;
}

export interface InViewOptions {
  element: Element;
  onChange: (visible: boolean, entry: IntersectionObserverEntry) => void;
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  signal?: AbortSignal;
}

export function observeScrollProgress(options: ScrollProgressOptions): ExperienceCleanup {
  const {element, onProgress, signal} = options;
  const ownsScheduler = !options.scheduler;
  const scheduler = options.scheduler ?? new RafFrameScheduler();
  let scheduled = false;
  const update = () => {
    if (scheduled || signal?.aborted) return;
    scheduled = true;
    scheduler.read(() => {
      const rect = element.getBoundingClientRect();
      const distance = window.innerHeight + rect.height;
      const progress = distance > 0 ? clamp((window.innerHeight - rect.top) / distance) : 0;
      scheduler.write(() => {
        scheduled = false;
        if (!signal?.aborted) onProgress(progress);
      });
    });
  };
  window.addEventListener('scroll', update, {passive: true, signal});
  window.addEventListener('resize', update, {passive: true, signal});
  update();
  const dispose = () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    if (ownsScheduler) scheduler.cancelAll();
  };
  signal?.addEventListener('abort', dispose, {once: true});
  return dispose;
}

export function observeInView({element, onChange, root = null, rootMargin = '0px', threshold = 0, signal}: InViewOptions): ExperienceCleanup {
  const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting, entry), {root, rootMargin, threshold});
  observer.observe(element);
  const dispose = () => observer.disconnect();
  signal?.addEventListener('abort', dispose, {once: true});
  return dispose;
}

export function observeElementResize(element: Element, onResize: (entry: ResizeObserverEntry) => void, signal?: AbortSignal): ExperienceCleanup {
  const observer = new ResizeObserver(([entry]) => onResize(entry));
  observer.observe(element);
  const dispose = () => observer.disconnect();
  signal?.addEventListener('abort', dispose, {once: true});
  return dispose;
}
