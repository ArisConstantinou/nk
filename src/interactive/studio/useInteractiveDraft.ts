import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AdminApiError, adminApi, errorMessage} from '../../admin/api';
import {isPagesAdminMode} from '../../admin/pagesMode';
import type {ExperienceDocument, InteractiveExperienceRecord} from '../engine/schema';

const clone = <T,>(value: T): T => structuredClone(value);
const equalDocuments = (left: ExperienceDocument, right: ExperienceDocument) => JSON.stringify(left) === JSON.stringify(right);

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
  }, [refreshHistory]);

  const applyRecord = useCallback((next: InteractiveExperienceRecord, resetHistory = false) => {
    const nextDraft = clone(next.draft);
    recordRef.current = next;
    documentRef.current = nextDraft;
    savedDocumentRef.current = clone(next.draft);
    setRecord(next);
    setDocumentState(nextDraft);
    setDirty(false);
    setPhase('ready');
    setMessage(next.status === 'published' ? 'Published version is live. Draft is ready.' : 'Draft ready.');
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
        let response: {record: InteractiveExperienceRecord};
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
        if (!disposed) applyRecord(response.record, true);
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
    setDirty(true);
    setMessage('Unsaved draft changes · live preview updated');
  }, [commitHistory]);

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
  }, [commitHistory]);

  const applyHistoryDocument = useCallback((next: ExperienceDocument, nextMessage: string) => {
    documentRef.current = next;
    setDocumentState(next);
    setDirty(!equalDocuments(next, savedDocumentRef.current));
    setMessage(nextMessage);
    setPhase('ready');
    refreshHistory();
  }, [refreshHistory]);

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
    const currentRecord = recordRef.current;
    if (!currentRecord) throw new Error('The draft has not loaded yet.');
    setPhase('saving');
    setMessage(isPagesAdminMode ? 'Saving draft on this device…' : 'Saving secure draft…');
    try {
      const response = await adminApi<{record: InteractiveExperienceRecord}>(`/interactive/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: documentRef.current.title,
          document: documentRef.current,
          expectedVersion: currentRecord.version,
        }),
      });
      return applyRecord(response.record);
    } catch (error) {
      setPhase('error');
      setMessage(errorMessage(error));
      throw error;
    }
  }, [applyRecord, slug]);

  const publish = useCallback(async () => {
    setPhase('publishing');
    setMessage('Validating and publishing…');
    try {
      const saved = dirty ? await save() : recordRef.current;
      if (!saved) throw new Error('The draft has not loaded yet.');
      setPhase('publishing');
      const response = await adminApi<{record: InteractiveExperienceRecord}>(`/interactive/${encodeURIComponent(slug)}/publish`, {
        method: 'POST',
        body: JSON.stringify({expectedVersion: saved.version}),
      });
      const next = applyRecord(response.record);
      setMessage(isPagesAdminMode ? 'Published preview updated on this device.' : 'Published successfully. Public visitors now receive this version.');
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
