import {useEffect, useRef, useState} from 'react';
import {GlobalWorkerOptions} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {Catalogue} from '../types';
import {publicAsset} from '../utils/assets';
import {createCataloguePdfTask} from '../utils/cataloguePdf';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type CatalogueCoverPreviewProps = {
  catalogue: Catalogue;
  variant?: 'entry' | 'shelf' | 'spine';
};

const shelfCoverAssets: Record<string, string> = {
  'ACA Lighting 2026': 'assets/generated/catalogue-covers/aca-lighting-2026.png',
  'Nova Luce 2026 · Book 1': 'assets/generated/catalogue-covers/nova-luce-2026-book-1.png',
  'VIOKEF 2026': 'assets/generated/catalogue-covers/viokef-2026.png',
};

export const catalogueShelfCover = (catalogue: Catalogue) => {
  const asset = shelfCoverAssets[catalogue.name];
  return asset ? publicAsset(asset) : '';
};

export function CatalogueCoverPreview({catalogue, variant = 'entry'}: CatalogueCoverPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const shelfCover = variant === 'shelf' ? catalogueShelfCover(catalogue) : '';
  const previewReady = ready || Boolean(shelfCover);

  useEffect(() => {
    setReady(Boolean(shelfCover));
    setError('');
    if (shelfCover) return;

    let cancelled = false;
    let abort = () => {};
    void createCataloguePdfTask(catalogue.url).then(source => {
      abort = source.abort;
      return source.promise;
    }).then(async pdf => {
      const page = await pdf.getPage(1);
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({scale: variant === 'spine' ? .2 : variant === 'shelf' ? .32 : .42});
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return;
      await page.render({canvas, canvasContext: context, viewport}).promise;
      if (!cancelled) setReady(true);
      void pdf.destroy();
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { cancelled = true; abort(); };
  }, [catalogue, shelfCover, variant]);

  return <div className={`catalogue-cover-preview catalogue-cover-preview--${variant}${previewReady ? ' is-ready' : ''}${error ? ' has-error' : ''}`} aria-hidden={variant !== 'entry'}>
    {shelfCover ? <img src={shelfCover} alt="" loading="eager" decoding="sync"/> : <canvas ref={canvasRef}/>}
    {variant === 'entry' && <span>{ready ? `Preview · ${catalogue.name}` : error ? `Catalogue preview unavailable: ${error}` : 'Loading official catalogue preview…'}</span>}
  </div>;
}
