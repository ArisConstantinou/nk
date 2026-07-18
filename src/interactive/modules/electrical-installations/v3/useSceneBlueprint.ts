import {useCallback, useMemo, useState} from 'react';
import {
  cloneSceneBlueprint,
  type SceneObjectDefinition,
  type Transform2D,
  type Transform3D,
} from './sceneBlueprint';

const STORAGE_KEY = 'nk-electrical-v3.2-scene-blueprint';

const loadStoredBlueprint = () => {
  if (typeof window === 'undefined') return cloneSceneBlueprint();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneSceneBlueprint();
    const parsed = JSON.parse(stored) as SceneObjectDefinition[];
    return Array.isArray(parsed) && parsed.length ? parsed : cloneSceneBlueprint();
  } catch {
    return cloneSceneBlueprint();
  }
};

export function useSceneBlueprint() {
  const [objects, setObjects] = useState<SceneObjectDefinition[]>(loadStoredBlueprint);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => objects.find(item => item.id === selectedId) ?? null, [objects, selectedId]);

  const update = useCallback((id: string, patch: Partial<SceneObjectDefinition>) => {
    setObjects(current => {
      const next = current.map(item => item.id === id ? {
        ...item,
        ...patch,
        transform2d: patch.transform2d ? {...item.transform2d, ...patch.transform2d} : item.transform2d,
        transform3d: patch.transform3d ? {...item.transform3d, ...patch.transform3d} : item.transform3d,
        properties: patch.properties ? {...item.properties, ...patch.properties} : item.properties,
      } : item);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const update2d = useCallback((id: string, patch: Partial<Transform2D>) => {
    const current = objects.find(item => item.id === id);
    if (current) update(id, {transform2d: {...current.transform2d, ...patch}});
  }, [objects, update]);

  const update3d = useCallback((id: string, patch: Partial<Transform3D>) => {
    const current = objects.find(item => item.id === id);
    if (current) update(id, {transform3d: {...current.transform3d, ...patch}});
  }, [objects, update]);

  const reset = useCallback(() => {
    const next = cloneSceneBlueprint();
    window.localStorage.removeItem(STORAGE_KEY);
    setObjects(next);
    setSelectedId(null);
  }, []);

  const exportBlueprint = useCallback(() => {
    const blob = new Blob([JSON.stringify(objects, null, 2)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'nk-electrical-scene-v3.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [objects]);

  const importBlueprint = useCallback((text: string) => {
    const parsed = JSON.parse(text) as SceneObjectDefinition[];
    if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item.id === 'string')) {
      throw new Error('The selected file is not a valid NK scene blueprint.');
    }
    setObjects(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  }, []);

  const replaceBlueprint = useCallback((next: SceneObjectDefinition[]) => {
    if (!Array.isArray(next) || !next.every(item => item && typeof item.id === 'string')) {
      throw new Error('Generated animation returned an invalid NK scene blueprint.');
    }
    setObjects(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedId(current => current && next.some(item => item.id === current) ? current : null);
  }, []);

  return {
    objects,
    selected,
    selectedId,
    setSelectedId,
    update,
    update2d,
    update3d,
    reset,
    exportBlueprint,
    importBlueprint,
    replaceBlueprint,
  } as const;
}
