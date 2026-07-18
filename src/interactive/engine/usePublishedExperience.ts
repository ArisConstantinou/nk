import {useEffect, useState} from 'react';
import {isExperienceDocument} from './documentValidation';
import type {ExperienceDocument} from './schema';

type PublishedResponse = {
  experience?: ExperienceDocument;
};

export function usePublishedExperience(slug: string, releaseFallback: ExperienceDocument) {
  const [document, setDocument] = useState(releaseFallback);
  const [source, setSource] = useState<'release' | 'published'>('release');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/public/interactive/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'},
    }).then(async response => {
      if (!response.ok) return null;
      return response.json() as Promise<PublishedResponse>;
    }).then(payload => {
      if (payload?.experience && isExperienceDocument(payload.experience)) {
        setDocument(payload.experience);
        setSource('published');
      }
    }).catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (import.meta.env.DEV) console.info('Using the release-bundled interactive template.', error);
    });
    return () => controller.abort();
  }, [slug]);

  return {document, source} as const;
}
