import {useEffect, useRef, useState} from 'react';
import {GlobalWorkerOptions} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {Catalogue} from '../types';
import {createCataloguePdfTask} from '../utils/cataloguePdf';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function CatalogueCoverPreview({catalogue}: {catalogue: Catalogue}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let abort = () => {};
    void createCataloguePdfTask(catalogue.url).then(source => {
      abort = source.abort;
      return source.task.promise;
    }).then(async pdf => {
      const page = await pdf.getPage(1);
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({scale: .42});
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return;
      await page.render({canvas, canvasContext: context, viewport}).promise;
      if (!cancelled) setReady(true);
      void pdf.destroy();
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { cancelled = true; abort(); };
  }, [catalogue]);

  return <div className={`catalogue-entry__preview ${ready ? 'is-ready' : ''}`} aria-label={`First page preview: ${catalogue.name}`}><canvas ref={canvasRef}/><span>{ready ? `Preview · ${catalogue.name}` : error ? `Catalogue preview unavailable: ${error}` : 'Loading official catalogue preview…'}</span></div>;
}
