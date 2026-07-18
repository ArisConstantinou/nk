import {useCallback, useEffect, useRef, useState} from 'react';
import {AdminApiError, adminApi, errorMessage} from '../../admin/api';
import {isPagesAdminMode} from '../../admin/pagesMode';
import type {ExperienceDocument, InteractiveExperienceRecord} from '../engine/schema';

const clone = <T,>(value: T): T => structuredClone(value);

export function useInteractiveDraft(slug: string, seed: ExperienceDocument) {
  const [record, setRecord] = useState<InteractiveExperienceRecord | null>(null);
  const [document, setDocumentState] = useState<ExperienceDocument>(() => clone(seed));
  const [phase, setPhase] = useState<'loading' | 'ready' | 'saving' | 'publishing' | 'error'>('loading');
  const [message, setMessage] = useState(isPagesAdminMode ? 'Loading device draft…' : 'Loading secure draft…');
  const [dirty, setDirty] = useState(false);
  const recordRef = useRef<InteractiveExperienceRecord | null>(null);
  const documentRef = useRef(document);

  const applyRecord = useCallback((next: InteractiveExperienceRecord) => {
    recordRef.current = next;
    documentRef.current = clone(next.draft);
    setRecord(next);
    setDocumentState(clone(next.draft));
    setDirty(false);
    setPhase('ready');
    setMessage(next.status === 'published' ? 'Published version is live. Draft is ready.' : 'Draft ready.');
    return next;
  }, []);

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
        if (!disposed) applyRecord(response.record);
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

  const setDocument = useCallback((change: ExperienceDocument | ((current: ExperienceDocument) => ExperienceDocument)) => {
    setDocumentState(current => {
      const next = typeof change === 'function' ? change(current) : change;
      documentRef.current = next;
      return next;
    });
    setDirty(true);
    setMessage('Unsaved draft changes · live preview updated');
  }, []);

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

  return {record, document, setDocument, phase, message, dirty, save, publish} as const;
}
