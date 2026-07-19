import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AdminApiError, adminApi, errorMessage} from '../../admin/api';
import {isPagesAdminMode} from '../../admin/pagesMode';
import {isExperienceDocument} from '../engine/documentValidation';
import {assetAspectRatio, findAsset, type ExperienceDocument, type InteractiveExperienceRecord} from '../engine/schema';
import {
  adaptTransformToSurface,
  clearTransformOrientation,
  constrainTransformToSurface,
  fitTransformToSurface,
  isLegacyAutomaticallyOrientedTransform,
  surfaceBounds,
  synchronizeCalibratedSurfaces,
} from '../surfaces/roomSurfaceCalibration';
import {hasPointBoundedGeometry, normalizePointLayerGeometry} from './pointLayerEditing';

const clone = <T,>(value: T): T => structuredClone(value);
const equalDocuments = (left: ExperienceDocument, right: ExperienceDocument) => JSON.stringify(left) === JSON.stringify(right);
const RECOVERY_SCHEMA_VERSION = 1;
const recoveryKey = (slug: string) => `nk-interactive-draft-recovery-v${RECOVERY_SCHEMA_VERSION}:${slug}`;
const wideWallFixtureFit = {widthCoverage: 1, heightCoverage: 1, marginScale: 0} as const;

const mergeBundledAssets = (document: ExperienceDocument, seed: ExperienceDocument) => {
  const currentRevision = document.bundledAssetRevision || 0;
  const seedRevision = seed.bundledAssetRevision || 0;
  if (currentRevision >= seedRevision) return document;

  const groupsById = new Map(document.assetGroups.map(group => [group.id, group]));
  const assetGroups = document.assetGroups.map(group => {
    const seedGroup = seed.assetGroups.find(item => item.id === group.id);
    if (!seedGroup) return group;
    const seedAssetsById = new Map(seedGroup.assets.map(asset => [asset.id, asset]));
    const updatedAssets = group.assets.map(asset => {
      const seedAsset = seedAssetsById.get(asset.id);
      return seedAsset ? clone(seedAsset) : asset;
    });
    const existingAssetIds = new Set(updatedAssets.map(asset => asset.id));
    const missingAssets = seedGroup.assets.filter(asset => !existingAssetIds.has(asset.id));
    return {...group, assets: [...updatedAssets, ...clone(missingAssets)]};
  });

  for (const seedGroup of seed.assetGroups) {
    if (!groupsById.has(seedGroup.id)) assetGroups.push(clone(seedGroup));
  }

  const assetDocument = {...document, assetGroups};
  let sections = currentRevision < 2
    ? document.sections.map(section => {
        const surfaces = section.surfaces || [];
        return {
          ...section,
          layers: section.layers.map(layer => {
            if (!layer.surfaceId) return layer;
            const surface = surfaces.find(candidate => candidate.id === layer.surfaceId);
            if (!surface) return layer;
            const asset = layer.type === 'asset' && layer.assetFit !== 'cover'
              ? findAsset(assetDocument, layer.assetId)
              : null;
            return {
              ...layer,
              transform: constrainTransformToSurface(
                surface,
                adaptTransformToSurface(surface, layer.transform),
                asset ? assetAspectRatio(asset) : undefined,
              ),
            };
          }),
        };
      })
    : document.sections;

  if (currentRevision < 3) {
    sections = sections.map(section => {
      const surfaces = section.surfaces || [];
      return {
        ...section,
        layers: section.layers.map(layer => {
          if (layer.type !== 'asset' || layer.assetId !== 'asset-wood-structure-no-led') return layer;
          const surface = surfaces.find(candidate => candidate.id === layer.surfaceId)
            || surfaces.find(candidate => candidate.id === 'surface-main-wall')
            || surfaces.find(candidate => candidate.kind === 'wall');
          if (!surface) return layer;
          const asset = findAsset(assetDocument, layer.assetId);
          const ratio = asset ? assetAspectRatio(asset) : layer.transform.width / Math.max(1, layer.transform.height);
          const width = Math.max(600, layer.transform.width);
          return {
            ...layer,
            surfaceId: surface.id,
            transform: fitTransformToSurface(
              surface,
              {...layer.transform, width, height: width / ratio},
              undefined,
              wideWallFixtureFit,
            ),
          };
        }),
      };
    });
  }

  if (currentRevision < 5) {
    sections = sections.map(section => {
      const surfaces = section.surfaces || [];
      return {
        ...section,
        layers: section.layers.map(layer => {
          if (
            layer.type !== 'asset'
            || layer.description === 'Frame background asset.'
            || !layer.surfaceId
          ) return layer;
          const surface = surfaces.find(candidate => candidate.id === layer.surfaceId);
          if (!surface || !isLegacyAutomaticallyOrientedTransform(surface, layer.transform)) return layer;
          return {
            ...layer,
            surfaceId: undefined,
            transform: clearTransformOrientation(layer.transform),
          };
        }),
      };
    });
  }

  if (currentRevision < 8) {
    sections = sections.map(section => ({
      ...section,
      layers: section.layers.map(layer => (
        hasPointBoundedGeometry(layer)
          ? {...layer, ...normalizePointLayerGeometry(layer, document.stage)}
          : layer
      )),
    }));
  }

  if (currentRevision < 9) {
    sections = sections.map(section => (
      section.layers.some(layer => layer.calibrationRole)
        ? synchronizeCalibratedSurfaces(section, document.stage)
        : section
    ));
  }

  if (currentRevision < 10) {
    sections = sections.map(section => {
      const surfaces = section.surfaces || [];
      return {
        ...section,
        layers: section.layers.map(layer => {
          if (
            layer.type !== 'asset'
            || layer.description === 'Frame background asset.'
            || !layer.surfaceId
          ) return layer;
          const surface = surfaces.find(candidate => candidate.id === layer.surfaceId);
          const hasSmallLegacyOrientation = (
            Math.abs(layer.transform.rotation) > .001
            || Math.abs(layer.transform.skewX) > .001
            || Math.abs(layer.transform.skewY) > .001
          ) && Math.max(
            Math.abs(layer.transform.rotation),
            Math.abs(layer.transform.skewX),
            Math.abs(layer.transform.skewY),
          ) < 2;
          if (!surface || !hasSmallLegacyOrientation) return layer;
          const asset = findAsset(assetDocument, layer.assetId);
          return {
            ...layer,
            transform: constrainTransformToSurface(
              surface,
              clearTransformOrientation(layer.transform),
              asset ? assetAspectRatio(asset) : undefined,
            ),
          };
        }),
      };
    });
  }

  if (currentRevision < 11) {
    sections = sections.map(section => {
      const surfaces = section.surfaces || [];
      return {
        ...section,
        layers: section.layers.map(layer => {
          if (
            layer.type !== 'asset'
            || layer.assetId !== 'asset-wood-structure-no-led'
            || !layer.surfaceId
          ) return layer;
          const surface = surfaces.find(candidate => candidate.id === layer.surfaceId);
          const asset = findAsset(assetDocument, layer.assetId);
          if (!surface || !asset) return layer;
          const bounds = surfaceBounds(surface);
          const ratio = assetAspectRatio(asset);
          return {
            ...layer,
            transform: fitTransformToSurface(
              surface,
              {
                ...clearTransformOrientation(layer.transform),
                width: bounds.width,
                height: bounds.width / ratio,
              },
              undefined,
              wideWallFixtureFit,
            ),
          };
        }),
      };
    });
  }

  return {
    ...document,
    bundledAssetRevision: seedRevision,
    assetGroups,
    sections,
  };
};

type InteractiveDraftRecovery = {
  schemaVersion: typeof RECOVERY_SCHEMA_VERSION;
  slug: string;
  recordId: string;
  baseVersion: number;
  savedAt: number;
  document: ExperienceDocument;
};

type RecoveryStorageMode = 'local' | 'session' | 'unavailable';

const isRecoverableDocument = (value: unknown): value is ExperienceDocument => {
  if (isExperienceDocument(value)) return true;
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<ExperienceDocument>;
  return typeof document.schemaVersion === 'number'
    && typeof document.id === 'string'
    && typeof document.slug === 'string'
    && typeof document.title === 'string'
    && Boolean(document.stage && typeof document.stage.width === 'number' && typeof document.stage.height === 'number')
    && Boolean(document.settings && typeof document.settings === 'object')
    && Array.isArray(document.assetGroups)
    && Array.isArray(document.sections)
    && document.sections.length > 0
    && document.sections.every(section => (
      Boolean(section)
      && typeof section.id === 'string'
      && typeof section.name === 'string'
      && Array.isArray(section.layers)
    ));
};

const parseRecovery = (value: string | null): InteractiveDraftRecovery | null => {
  if (!value) return null;
  try {
    const recovery = JSON.parse(value) as Partial<InteractiveDraftRecovery>;
    if (
      recovery.schemaVersion !== RECOVERY_SCHEMA_VERSION
      || typeof recovery.slug !== 'string'
      || typeof recovery.recordId !== 'string'
      || !Number.isInteger(recovery.baseVersion)
      || typeof recovery.savedAt !== 'number'
      || !isRecoverableDocument(recovery.document)
    ) return null;
    return recovery as InteractiveDraftRecovery;
  } catch {
    return null;
  }
};

const readRecovery = (slug: string): InteractiveDraftRecovery | null => {
  if (typeof window === 'undefined') return null;
  const key = recoveryKey(slug);
  const candidates: InteractiveDraftRecovery[] = [];
  try {
    const local = parseRecovery(window.localStorage.getItem(key));
    if (local) candidates.push(local);
  } catch {
    // Blocked storage must not prevent the Studio from loading.
  }
  try {
    const session = parseRecovery(window.sessionStorage.getItem(key));
    if (session) candidates.push(session);
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
  return candidates.sort((left, right) => right.savedAt - left.savedAt)[0] || null;
};

const writeRecovery = (
  slug: string,
  record: InteractiveExperienceRecord,
  document: ExperienceDocument,
): RecoveryStorageMode => {
  if (typeof window === 'undefined') return 'unavailable';
  const key = recoveryKey(slug);
  const serialized = JSON.stringify({
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    slug,
    recordId: record.id,
    baseVersion: record.version,
    savedAt: Date.now(),
    document,
  } satisfies InteractiveDraftRecovery);
  try {
    window.localStorage.setItem(key, serialized);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // The durable local copy is enough.
    }
    return 'local';
  } catch {
    try {
      window.sessionStorage.setItem(key, serialized);
      return 'session';
    } catch {
      return 'unavailable';
    }
  }
};

const clearRecovery = (slug: string) => {
  if (typeof window === 'undefined') return;
  const key = recoveryKey(slug);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be blocked.
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be blocked.
  }
};

export type InteractiveHistoryOptions = {
  label?: string;
  objectIds?: string[];
  coalesceKey?: string;
};

export type InteractiveHistoryItem = {
  id: string;
  label: string;
  objectIds: string[];
  timestamp: number;
  active: boolean;
};

type InteractiveHistoryEntry = Omit<InteractiveHistoryItem, 'active'> & {
  before: ExperienceDocument;
  after: ExperienceDocument;
  coalesceKey?: string;
};

type InteractiveHistoryTransaction = InteractiveHistoryOptions & {
  before: ExperienceDocument;
};

type InteractiveDraftResponse = {
  record: InteractiveExperienceRecord;
  storageMode?: 'persistent' | 'temporary';
};

export function useInteractiveDraft(slug: string, seed: ExperienceDocument) {
  const [record, setRecord] = useState<InteractiveExperienceRecord | null>(null);
  const [document, setDocumentState] = useState<ExperienceDocument>(() => clone(seed));
  const [phase, setPhase] = useState<'loading' | 'ready' | 'saving' | 'publishing' | 'error'>('loading');
  const [message, setMessage] = useState(isPagesAdminMode ? 'Loading device draft…' : 'Loading secure draft…');
  const [dirty, setDirty] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const recordRef = useRef<InteractiveExperienceRecord | null>(null);
  const documentRef = useRef(document);
  const savedDocumentRef = useRef(clone(seed));
  const undoStackRef = useRef<InteractiveHistoryEntry[]>([]);
  const redoStackRef = useRef<InteractiveHistoryEntry[]>([]);
  const transactionRef = useRef<InteractiveHistoryTransaction | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveInFlightRef = useRef<Promise<void> | null>(null);
  const autosaveQueuedRef = useRef(false);

  const refreshHistory = useCallback(() => setHistoryVersion(version => version + 1), []);

  const commitHistory = useCallback((before: ExperienceDocument, after: ExperienceDocument, options: InteractiveHistoryOptions = {}) => {
    if (equalDocuments(before, after)) return;
    const timestamp = Date.now();
    const label = options.label || 'Edit interactive experience';
    const objectIds = [...new Set(options.objectIds || [])];
    const last = undoStackRef.current.at(-1);
    const canCoalesce = Boolean(
      options.coalesceKey
      && last?.coalesceKey === options.coalesceKey
      && timestamp - last.timestamp < 700,
    );
    if (canCoalesce && last) {
      undoStackRef.current[undoStackRef.current.length - 1] = {
        ...last,
        label,
        objectIds,
        timestamp,
        after: clone(after),
      };
    } else {
      undoStackRef.current = [...undoStackRef.current, {
        id: globalThis.crypto?.randomUUID?.() || `history-${timestamp}-${Math.random().toString(16).slice(2)}`,
        label,
        objectIds,
        timestamp,
        before: clone(before),
        after: clone(after),
        coalesceKey: options.coalesceKey,
      }].slice(-100);
    }
    redoStackRef.current = [];
    refreshHistory();
  }, [refreshHistory, seed, slug]);

  const applyRecord = useCallback((
    next: InteractiveExperienceRecord,
    resetHistory = false,
    storageMode: InteractiveDraftResponse['storageMode'] = 'persistent',
    recoveredDocument?: ExperienceDocument,
  ) => {
    const sourceDraft = clone(recoveredDocument || next.draft);
    const nextDraft = mergeBundledAssets(sourceDraft, seed);
    const migrated = !equalDocuments(sourceDraft, nextDraft);
    const recovered = Boolean(recoveredDocument && !equalDocuments(recoveredDocument, next.draft));
    recordRef.current = next;
    documentRef.current = nextDraft;
    savedDocumentRef.current = clone(next.draft);
    setRecord(next);
    setDocumentState(nextDraft);
    setDirty(recovered || migrated);
    setPhase('ready');
    setMessage(migrated
      ? 'New built-in backgrounds were added to the asset library and saved on this device.'
      : recovered
        ? 'Recovered the latest automatic draft from this device.'
      : storageMode === 'temporary'
        ? 'Mobile safe mode · Studio is open, but oversized local media is excluded from session recovery.'
        : next.status === 'published' ? 'Published version is live. Draft is ready.' : 'Draft ready.');
    if (migrated) writeRecovery(slug, next, nextDraft);
    if (resetHistory) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      transactionRef.current = null;
      refreshHistory();
    }
    return next;
  }, [refreshHistory]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      setPhase('loading');
      try {
        let response: InteractiveDraftResponse;
        try {
          response = await adminApi(`/interactive/${encodeURIComponent(slug)}`);
        } catch (error) {
          if (!(error instanceof AdminApiError) || error.status !== 404) throw error;
          try {
            response = await adminApi('/interactive', {
              method: 'POST',
              body: JSON.stringify({slug, title: seed.title, document: seed}),
            });
          } catch (createError) {
            if (!(createError instanceof AdminApiError) || createError.status !== 409 || createError.code !== 'slug_exists') throw createError;
            response = await adminApi(`/interactive/${encodeURIComponent(slug)}`);
          }
        }
        if (!disposed) {
          const recovery = readRecovery(slug);
          const canRecover = Boolean(
            recovery
            && recovery.slug === slug
            && recovery.recordId === response.record.id
            && recovery.baseVersion === response.record.version
            && recovery.document.id === response.record.draft.id
            && recovery.document.slug === response.record.draft.slug
          );
          if (recovery && !canRecover) clearRecovery(slug);
          const recoveredDocument = canRecover && recovery && !equalDocuments(recovery.document, response.record.draft)
            ? recovery.document
            : undefined;
          if (canRecover && !recoveredDocument) clearRecovery(slug);
          applyRecord(response.record, true, response.storageMode, recoveredDocument);
        }
      } catch (error) {
        if (!disposed) {
          setPhase('error');
          setMessage(errorMessage(error));
        }
      }
    };
    void load();
    return () => {disposed = true;};
  }, [applyRecord, seed, slug]);

  const persistAutomatically = useCallback(async () => {
    if (autosaveInFlightRef.current) {
      autosaveQueuedRef.current = true;
      return;
    }
    const currentRecord = recordRef.current;
    const snapshot = clone(documentRef.current);
    if (!currentRecord || equalDocuments(snapshot, savedDocumentRef.current)) return;

    const task = (async () => {
      try {
        const response = await adminApi<InteractiveDraftResponse>(`/interactive/${encodeURIComponent(slug)}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: snapshot.title,
            document: snapshot,
            expectedVersion: currentRecord.version,
          }),
        });
        recordRef.current = response.record;
        savedDocumentRef.current = clone(response.record.draft);
        setRecord(response.record);

        const latest = documentRef.current;
        if (equalDocuments(latest, response.record.draft)) {
          setDirty(false);
          clearRecovery(slug);
          setMessage(response.storageMode === 'temporary'
            ? 'Changes saved automatically for this browser session.'
            : 'All changes saved automatically.');
        } else {
          setDirty(true);
          writeRecovery(slug, response.record, latest);
          autosaveQueuedRef.current = true;
        }
      } catch (error) {
        const latestRecord = recordRef.current;
        if (latestRecord) writeRecovery(slug, latestRecord, documentRef.current);
        setMessage(`Changes remain saved on this device · sync again with the next edit or Save Draft (${errorMessage(error)})`);
      }
    })();

    autosaveInFlightRef.current = task;
    try {
      await task;
    } finally {
      autosaveInFlightRef.current = null;
      if (autosaveQueuedRef.current) {
        autosaveQueuedRef.current = false;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
          autosaveTimerRef.current = null;
          void persistAutomatically();
        }, 80);
      }
    }
  }, [slug]);

  const scheduleAutomaticSave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistAutomatically();
    }, 120);
  }, [persistAutomatically]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  const rememberDocument = useCallback((next: ExperienceDocument, actionMessage?: string) => {
    const changed = !equalDocuments(next, savedDocumentRef.current);
    setDirty(changed);
    if (!changed) {
      clearRecovery(slug);
      setMessage(actionMessage || 'Draft matches the saved version.');
      return;
    }
    const currentRecord = recordRef.current;
    const recoveryMode = currentRecord ? writeRecovery(slug, currentRecord, next) : 'unavailable';
    setMessage(recoveryMode === 'local'
      ? actionMessage ? `${actionMessage} · saved automatically` : 'Changes saved automatically on this device.'
      : recoveryMode === 'session'
        ? actionMessage ? `${actionMessage} · saved for this browser session` : 'Changes saved for this browser session. Device storage is full.'
        : actionMessage || 'Unsaved draft changes · live preview updated');
    scheduleAutomaticSave();
  }, [scheduleAutomaticSave, slug]);

  const setDocument = useCallback((
    change: ExperienceDocument | ((current: ExperienceDocument) => ExperienceDocument),
    options: InteractiveHistoryOptions = {},
  ) => {
    const current = documentRef.current;
    const next = typeof change === 'function' ? change(current) : change;
    if (next === current || equalDocuments(current, next)) return;
    if (!transactionRef.current) commitHistory(current, next, options);
    documentRef.current = next;
    setDocumentState(next);
    if (transactionRef.current) {
      setDirty(true);
      setMessage('Updating selection · changes save when the gesture ends');
    } else {
      rememberDocument(next);
    }
  }, [commitHistory, rememberDocument]);

  const beginHistory = useCallback((options: InteractiveHistoryOptions = {}) => {
    if (transactionRef.current) return;
    transactionRef.current = {
      ...options,
      objectIds: [...new Set(options.objectIds || [])],
      before: clone(documentRef.current),
    };
  }, []);

  const endHistory = useCallback(() => {
    const transaction = transactionRef.current;
    if (!transaction) return;
    transactionRef.current = null;
    commitHistory(transaction.before, documentRef.current, transaction);
    rememberDocument(documentRef.current);
  }, [commitHistory, rememberDocument]);

  const applyHistoryDocument = useCallback((next: ExperienceDocument, nextMessage: string) => {
    documentRef.current = next;
    setDocumentState(next);
    rememberDocument(next, nextMessage);
    setPhase('ready');
    refreshHistory();
  }, [refreshHistory, rememberDocument]);

  const undo = useCallback(() => {
    if (transactionRef.current) endHistory();
    const entry = undoStackRef.current.pop();
    if (!entry) {
      setMessage('Nothing to undo.');
      return false;
    }
    redoStackRef.current.push(entry);
    applyHistoryDocument(clone(entry.before), `Undid: ${entry.label}`);
    return true;
  }, [applyHistoryDocument, endHistory]);

  const redo = useCallback(() => {
    if (transactionRef.current) endHistory();
    const entry = redoStackRef.current.pop();
    if (!entry) {
      setMessage('Nothing to redo.');
      return false;
    }
    undoStackRef.current.push(entry);
    applyHistoryDocument(clone(entry.after), `Redid: ${entry.label}`);
    return true;
  }, [applyHistoryDocument, endHistory]);

  const save = useCallback(async () => {
    setPhase('saving');
    setMessage(isPagesAdminMode ? 'Saving draft on this device…' : 'Saving secure draft…');
    try {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      await persistAutomatically();
      if (autosaveInFlightRef.current) await autosaveInFlightRef.current;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      const currentRecord = recordRef.current;
      if (!currentRecord) throw new Error('The draft has not loaded yet.');
      if (equalDocuments(documentRef.current, savedDocumentRef.current)) {
        clearRecovery(slug);
        setDirty(false);
        setPhase('ready');
        setMessage('All changes are saved.');
        return currentRecord;
      }

      const response = await adminApi<InteractiveDraftResponse>(`/interactive/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: documentRef.current.title,
          document: documentRef.current,
          expectedVersion: currentRecord.version,
        }),
      });
      const next = applyRecord(response.record, false, response.storageMode);
      clearRecovery(slug);
      return next;
    } catch (error) {
      setPhase('error');
      setMessage(errorMessage(error));
      throw error;
    }
  }, [applyRecord, persistAutomatically, slug]);

  const publish = useCallback(async () => {
    setPhase('publishing');
    setMessage('Validating and publishing…');
    try {
      const saved = dirty ? await save() : recordRef.current;
      if (!saved) throw new Error('The draft has not loaded yet.');
      setPhase('publishing');
      const response = await adminApi<InteractiveDraftResponse>(`/interactive/${encodeURIComponent(slug)}/publish`, {
        method: 'POST',
        body: JSON.stringify({expectedVersion: saved.version}),
      });
      const next = applyRecord(response.record, false, response.storageMode);
      clearRecovery(slug);
      setMessage(response.storageMode === 'temporary'
        ? 'Published for this session · free device storage before relying on mobile persistence.'
        : isPagesAdminMode ? 'Published preview updated on this device.' : 'Published successfully. Public visitors now receive this version.');
      return next;
    } catch (error) {
      setPhase('error');
      setMessage(errorMessage(error));
      throw error;
    }
  }, [applyRecord, dirty, save, slug]);

  const history = useMemo<InteractiveHistoryItem[]>(() => [
    ...undoStackRef.current.map(entry => ({
      id: entry.id,
      label: entry.label,
      objectIds: entry.objectIds,
      timestamp: entry.timestamp,
      active: true,
    })),
    ...[...redoStackRef.current].reverse().map(entry => ({
      id: entry.id,
      label: entry.label,
      objectIds: entry.objectIds,
      timestamp: entry.timestamp,
      active: false,
    })),
  ], [historyVersion]);

  return {
    record,
    document,
    setDocument,
    phase,
    message,
    dirty,
    save,
    publish,
    history,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    undo,
    redo,
    beginHistory,
    endHistory,
  } as const;
}
