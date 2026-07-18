import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {SceneObjectDefinition} from './sceneBlueprint';

export const ANIMATION_GENERATION_CHANNEL = 'nk-electrical-animation-generation';
export const ANIMATION_PROGRESS_EVENT = 'nk:animation-generation-progress';
export const ANIMATION_COMPLETE_EVENT = 'nk:animation-generation-complete';
export const ANIMATION_ERROR_EVENT = 'nk:animation-generation-error';

export type LiveBuildPhase =
  | 'idle'
  | 'syncing'
  | 'loading-assets'
  | 'compiling'
  | 'validating'
  | 'generating'
  | 'ready'
  | 'error';

export type LiveBuildState = {
  phase: LiveBuildPhase;
  progress: number;
  revision: number;
  completedRevision: number;
  message: string;
  updatedAt: number;
};

type GenerationProgressDetail = {
  progress: number;
  message?: string;
  revision?: number;
};

type GenerationCompleteDetail = {
  objects?: SceneObjectDefinition[];
  message?: string;
  revision?: number;
};

type GenerationErrorDetail = {
  message?: string;
  revision?: number;
};

const initialState: LiveBuildState = {
  phase: 'idle',
  progress: 0,
  revision: 0,
  completedRevision: 0,
  message: 'Live preview ready',
  updatedAt: Date.now(),
};

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

function loadImageAsset(source: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => reject(new Error(`Asset timed out: ${source}`)), 8000);
    const finish = (callback: () => void) => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      callback();
    };
    image.onload = () => finish(resolve);
    image.onerror = () => finish(() => reject(new Error(`Asset could not be loaded: ${source}`)));
    image.decoding = 'async';
    image.src = source;
    if (image.complete && image.naturalWidth > 0) finish(resolve);
  });
}

function validateBlueprint(objects: readonly SceneObjectDefinition[]) {
  const ids = new Set<string>();
  for (const object of objects) {
    if (!object.id || ids.has(object.id)) throw new Error(`Invalid or duplicate object ID: ${object.id || 'unknown'}`);
    ids.add(object.id);
    if (object.stageIn < 0 || object.stageOut > 12 || object.stageIn > object.stageOut) {
      throw new Error(`Invalid stage range for ${object.label}`);
    }
    const values = [
      ...Object.values(object.transform2d),
      ...Object.values(object.transform3d),
      object.properties.opacity,
    ];
    if (values.some(value => !Number.isFinite(value))) throw new Error(`Invalid transform for ${object.label}`);
  }
}

export function useLiveAnimationBuild(
  objects: readonly SceneObjectDefinition[],
  onGeneratedObjects: (objects: SceneObjectDefinition[]) => void,
) {
  const [state, setState] = useState<LiveBuildState>(initialState);
  const [rebuildToken, setRebuildToken] = useState(0);
  const revisionRef = useRef(0);
  const completedRevisionRef = useRef(0);
  const blueprintKey = useMemo(() => JSON.stringify(objects), [objects]);

  const report = useCallback((patch: Partial<LiveBuildState>) => {
    setState(current => ({...current, ...patch, updatedAt: Date.now()}));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const revision = ++revisionRef.current;
    const compile = async () => {
      report({
        phase: 'syncing',
        progress: 12,
        revision,
        message: 'Applying changes to live preview…',
      });
      await nextFrame();
      if (cancelled) return;

      const assets = [...new Set(objects.map(object => object.asset).filter((asset): asset is string => Boolean(asset)))];
      report({
        phase: assets.length ? 'loading-assets' : 'compiling',
        progress: assets.length ? 24 : 62,
        message: assets.length ? `Loading assets 0 / ${assets.length}` : 'Compiling animation timeline…',
      });
      let loaded = 0;
      await Promise.all(assets.map(async asset => {
        await loadImageAsset(asset);
        loaded += 1;
        if (!cancelled) report({
          phase: 'loading-assets',
          progress: 24 + Math.round((loaded / assets.length) * 42),
          message: `Loading assets ${loaded} / ${assets.length}`,
        });
      }));
      if (cancelled) return;

      report({phase: 'compiling', progress: 76, message: 'Compiling animation timeline…'});
      await nextFrame();
      if (cancelled) return;

      report({phase: 'validating', progress: 90, message: 'Validating responsive output…'});
      validateBlueprint(objects);
      await nextFrame();
      if (cancelled) return;

      completedRevisionRef.current = revision;
      report({
        phase: 'ready',
        progress: 100,
        revision,
        completedRevision: revision,
        message: 'Final animation is live',
      });
    };
    void compile().catch(error => {
      if (!cancelled) report({
        phase: 'error',
        progress: 100,
        revision,
        message: error instanceof Error ? error.message : 'Animation build failed',
      });
    });
    return () => { cancelled = true; };
  }, [blueprintKey, objects, rebuildToken, report]);

  useEffect(() => {
    const applyProgress = (detail: GenerationProgressDetail) => {
      report({
        phase: 'generating',
        progress: Math.max(0, Math.min(99, detail.progress)),
        revision: detail.revision ?? revisionRef.current,
        message: detail.message ?? 'Generating animation…',
      });
    };
    const applyComplete = (detail: GenerationCompleteDetail) => {
      if (detail.objects?.length) onGeneratedObjects(detail.objects);
      const revision = detail.revision ?? revisionRef.current;
      completedRevisionRef.current = revision;
      report({
        phase: 'ready',
        progress: 100,
        revision,
        completedRevision: revision,
        message: detail.message ?? 'Generated animation loaded automatically',
      });
    };
    const applyError = (detail: GenerationErrorDetail) => {
      report({
        phase: 'error',
        progress: 100,
        revision: detail.revision ?? revisionRef.current,
        message: detail.message ?? 'Animation generation failed',
      });
    };
    const progress = (event: Event) => applyProgress((event as CustomEvent<GenerationProgressDetail>).detail);
    const complete = (event: Event) => applyComplete((event as CustomEvent<GenerationCompleteDetail>).detail);
    const error = (event: Event) => applyError((event as CustomEvent<GenerationErrorDetail>).detail);
    window.addEventListener(ANIMATION_PROGRESS_EVENT, progress);
    window.addEventListener(ANIMATION_COMPLETE_EVENT, complete);
    window.addEventListener(ANIMATION_ERROR_EVENT, error);

    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(ANIMATION_GENERATION_CHANNEL);
    if (channel) {
      channel.onmessage = event => {
        const message = event.data as {type?: string; detail?: GenerationProgressDetail & GenerationCompleteDetail & GenerationErrorDetail};
        if (message.type === 'progress') applyProgress(message.detail ?? {progress: 0});
        if (message.type === 'complete') applyComplete(message.detail ?? {});
        if (message.type === 'error') applyError(message.detail ?? {});
      };
    }
    return () => {
      window.removeEventListener(ANIMATION_PROGRESS_EVENT, progress);
      window.removeEventListener(ANIMATION_COMPLETE_EVENT, complete);
      window.removeEventListener(ANIMATION_ERROR_EVENT, error);
      channel?.close();
    };
  }, [onGeneratedObjects, report]);

  return {
    state,
    rebuild: () => setRebuildToken(value => value + 1),
  } as const;
}
