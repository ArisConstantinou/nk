import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {getInputCapabilities, getViewportSnapshot} from '../core/media';
import {RafFrameScheduler} from '../core/frameScheduler';
import type {
  ExperienceFallback,
  ExperienceModule,
  ExperienceProps,
} from '../core/types';
import {ExperienceErrorBoundary} from './ExperienceErrorBoundary';
import {useExperienceFramework} from './ExperienceProvider';
import {useMotionPreference} from './useMotionPreference';

type Phase = 'loading' | 'ready' | 'mounted' | 'failed';

export interface ExperienceSlotProps<TProps extends ExperienceProps = ExperienceProps> {
  slot: string;
  props?: TProps;
  className?: string;
  label?: string;
  decorative?: boolean;
  fallback?: ExperienceFallback;
}

const renderFallback = (fallback: ExperienceFallback | undefined, error: Error | null): ReactNode =>
  typeof fallback === 'function' ? fallback(error) : fallback ?? null;

const emitStatus = (id: string, slot: string, phase: Phase, error?: Error) => {
  window.dispatchEvent(new CustomEvent('nk:experience-status', {
    detail: {id, slot, phase, message: error?.message},
  }));
};

export function ExperienceSlot<TProps extends ExperienceProps = ExperienceProps>({
  slot,
  props,
  className = '',
  label,
  decorative = false,
  fallback,
}: ExperienceSlotProps<TProps>) {
  const {registry, route} = useExperienceFramework();
  const motion = useMotionPreference();
  const registration = registry.resolve<TProps>(slot, route);
  const disabledForMotion = motion === 'reduced' && registration?.reducedMotion === 'disable';
  const registrationKey = registration && !disabledForMotion ? `${registration.id}@${registration.version}` : '';
  const [loaded, setLoaded] = useState<{key: string; module: ExperienceModule<TProps>} | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<Error | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const mergedProps = useMemo(() => ({...(registration?.props ?? {}), ...(props ?? {})}) as TProps, [props, registration?.props]);
  const activeModule = loaded?.key === registrationKey ? loaded.module : null;

  useEffect(() => {
    let disposed = false;
    setError(null);
    setLoaded(null);
    if (!registration || disabledForMotion) return;
    setPhase('loading');
    registration.load().then(exports => {
      if (disposed) return;
      const module = exports.default;
      if (module.id !== registration.id) throw new Error(`Experience manifest id "${registration.id}" does not match module id "${module.id}".`);
      if (module.version !== registration.version) throw new Error(`Experience "${registration.id}" manifest version ${registration.version} does not match module version ${module.version}.`);
      setLoaded({key: registrationKey, module: module as ExperienceModule<TProps>});
      setPhase('ready');
      emitStatus(registration.id, slot, 'ready');
    }).catch(reason => {
      if (disposed) return;
      const nextError = reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      setPhase('failed');
      emitStatus(registration.id, slot, 'failed', nextError);
      if (import.meta.env.DEV) console.error(`Interactive experience "${registration.id}" failed to load`, nextError);
    });
    return () => { disposed = true; };
  }, [disabledForMotion, registration, registrationKey, slot]);

  useEffect(() => {
    const root = rootRef.current;
    if (!activeModule || !registration || !root) return;
    const controller = new AbortController();
    const frames = new RafFrameScheduler();
    let disposed = false;
    let cleanup: void | (() => void);
    let announcementTimer = 0;
    const announce = (message: string) => {
      if (decorative || !liveRef.current) return;
      window.clearTimeout(announcementTimer);
      liveRef.current.textContent = '';
      announcementTimer = window.setTimeout(() => {
        if (liveRef.current && !controller.signal.aborted) liveRef.current.textContent = message;
      }, 50);
    };
    const context = {
      root,
      props: mergedProps,
      route,
      motion,
      viewport: getViewportSnapshot(),
      input: getInputCapabilities(),
      signal: controller.signal,
      frames,
      select: <TElement extends Element = HTMLElement>(selector: string) => root.querySelector<TElement>(selector),
      selectAll: <TElement extends Element = HTMLElement>(selector: string) => [...root.querySelectorAll<TElement>(selector)],
      announce,
    };
    Promise.resolve(activeModule.mount?.(context)).then(result => {
      if (disposed) {
        if (typeof result === 'function') result();
        return;
      }
      cleanup = result;
      setPhase('mounted');
      emitStatus(registration.id, slot, 'mounted');
    }).catch(reason => {
      if (disposed || controller.signal.aborted) return;
      const nextError = reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      setPhase('failed');
      emitStatus(registration.id, slot, 'failed', nextError);
      if (import.meta.env.DEV) console.error(`Interactive experience "${registration.id}" failed to mount`, nextError);
    });
    return () => {
      disposed = true;
      controller.abort();
      frames.cancelAll();
      window.clearTimeout(announcementTimer);
      cleanup?.();
    };
  }, [activeModule, decorative, mergedProps, motion, registration, route, slot]);

  if (!registration || disabledForMotion) return <>{renderFallback(fallback, null)}</>;
  if (error || !activeModule) return <>{renderFallback(fallback, error)}</>;
  const View = activeModule.View;
  const fallbackNode = renderFallback(fallback, error);
  return <div
    ref={rootRef}
    className={`interactive-experience ${className}`.trim()}
    data-experience-id={registration.id}
    data-experience-slot={slot}
    data-experience-version={registration.version}
    data-experience-phase={phase}
    data-motion={motion}
    role={!decorative && label ? 'region' : undefined}
    aria-label={!decorative ? label : undefined}
    aria-hidden={decorative || undefined}
  >
    <ExperienceErrorBoundary key={registrationKey} fallback={fallbackNode} onError={nextError => {setError(nextError); setPhase('failed');}}>
      {View ? <View props={mergedProps} motion={motion} route={route}/> : null}
    </ExperienceErrorBoundary>
    {!decorative && <span ref={liveRef} className="interactive-experience__live" aria-live="polite" aria-atomic="true"/>}
  </div>;
}
