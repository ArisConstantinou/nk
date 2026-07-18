import type {ExperienceCleanup} from '../core/types';

export type GsapRuntime = Readonly<{
  gsap: typeof import('gsap')['gsap'];
  ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'];
}>;

let runtimePromise: Promise<GsapRuntime> | null = null;

const abortError = () => new DOMException('The interactive experience was disposed before GSAP loaded.', 'AbortError');

export async function loadGsap(signal?: AbortSignal): Promise<GsapRuntime> {
  if (signal?.aborted) throw abortError();
  runtimePromise ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, scrollModule]) => {
    gsapModule.gsap.registerPlugin(scrollModule.ScrollTrigger);
    return {gsap: gsapModule.gsap, ScrollTrigger: scrollModule.ScrollTrigger};
  });
  const runtime = await runtimePromise;
  if (signal?.aborted) throw abortError();
  return runtime;
}

export async function createGsapScope(root: HTMLElement, signal?: AbortSignal) {
  const {gsap, ScrollTrigger} = await loadGsap(signal);
  const context = gsap.context(() => undefined, root);
  let disposed = false;
  const dispose: ExperienceCleanup = () => {
    if (disposed) return;
    disposed = true;
    context.revert();
  };
  signal?.addEventListener('abort', dispose, {once: true});
  return {gsap, ScrollTrigger, context, dispose} as const;
}
