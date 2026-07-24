import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, LoaderCircle, X} from 'lucide-react';
import {GlobalWorkerOptions, type PDFDocumentProxy} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {Catalogue} from '../types';
import {createCataloguePdfTask} from '../utils/cataloguePdf';
import './unified-catalogue-book.css';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Props = {
  catalogues: Catalogue[];
  initialCatalogue: string;
  onCatalogueChange: (catalogue: string) => void;
  onClose: () => void;
};

type TurnState = {
  direction: -1 | 1;
  front: number | null;
  back: number | null;
  target: number;
};

const TURN_DURATION = 920;
const catalogueKey = (catalogue: Catalogue, index: number) => catalogue.id || `${catalogue.brand}-${catalogue.year}-${index}`;

export function catalogueBookLink(catalogue: Catalogue, index: number) {
  return `/shop/catalogues/book?catalogue=${encodeURIComponent(catalogueKey(catalogue, index))}`;
}

function spreadPages(start: number, total: number) {
  if (start === 1) return {left: null, right: 1};
  return {left: start <= total ? start : null, right: start + 1 <= total ? start + 1 : null};
}

function finalSpread(total: number) {
  if (total <= 1) return 1;
  return total % 2 === 0 ? total : total - 1;
}

export function UnifiedCatalogueBook({catalogues, initialCatalogue, onCatalogueChange, onClose}: Props) {
  const initialIndex = Math.max(0, catalogues.findIndex((catalogue, index) => catalogueKey(catalogue, index) === initialCatalogue));
  const [catalogueIndex, setCatalogueIndex] = useState(initialIndex);
  const [spreadStart, setSpreadStart] = useState(1);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState('Loading catalogue…');
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [showContents, setShowContents] = useState(false);
  const [renderedPages, setRenderedPages] = useState<Record<number, string>>({});
  const pageCacheRef = useRef(new Map<number, string>());
  const touchStart = useRef<number | null>(null);
  const openLastPageRef = useRef(false);
  const catalogue = catalogues[catalogueIndex];
  const catalogueLabel = useMemo(() => `${catalogue.brand} · ${catalogue.name}`, [catalogue]);
  const visible = document ? spreadPages(spreadStart, document.numPages) : {left: null, right: null};

  useEffect(() => {
    setCatalogueIndex(initialIndex);
    setSpreadStart(1);
  }, [initialIndex]);

  useEffect(() => {
    let cancelled = false;
    let abort = () => {};
    setDocument(null);
    setRenderedPages({});
    pageCacheRef.current.clear();
    setStatus(`Loading ${catalogue.name}…`);
    void createCataloguePdfTask(catalogue.url).then(source => {
      abort = source.abort;
      return source.task.promise;
    }).then(pdf => {
      if (cancelled) { void pdf.destroy(); return; }
      const destination = openLastPageRef.current ? finalSpread(pdf.numPages) : 1;
      openLastPageRef.current = false;
      setSpreadStart(destination);
      setDocument(pdf);
      setStatus('Preparing the book…');
    }).catch(() => {
      if (!cancelled) setStatus('The catalogue could not be loaded. Please try again.');
    });
    return () => { cancelled = true; abort(); };
  }, [catalogue]);

  const renderPageImage = useCallback(async (pageNumber: number | null) => {
    if (!document || !pageNumber || pageNumber < 1 || pageNumber > document.numPages) return null;
    const cached = pageCacheRef.current.get(pageNumber);
    if (cached) return cached;
    const page = await document.getPage(pageNumber);
    const base = page.getViewport({scale: 1});
    const scale = Math.min(2, 1500 / base.height);
    const viewport = page.getViewport({scale});
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    await page.render({canvas, canvasContext: context, viewport}).promise;
    const image = canvas.toDataURL('image/webp', .94);
    pageCacheRef.current.set(pageNumber, image);
    setRenderedPages(current => ({...current, [pageNumber]: image}));
    return image;
  }, [document]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    const around = spreadStart === 1
      ? [1, 2, 3]
      : [spreadStart - 2, spreadStart - 1, spreadStart, spreadStart + 1, spreadStart + 2, spreadStart + 3];
    const wanted = [...new Set(around.filter(page => page >= 1 && page <= document.numPages))];
    setStatus('Rendering real catalogue pages…');
    void Promise.all(wanted.map(page => renderPageImage(page))).then(() => {
      if (!cancelled) setStatus('');
    }).catch(() => {
      if (!cancelled) setStatus('A catalogue page could not be rendered.');
    });
    return () => { cancelled = true; };
  }, [document, renderPageImage, spreadStart]);

  const changePage = useCallback(async (direction: -1 | 1) => {
    if (!document || turn) return;
    const atFirst = spreadStart === 1;
    const atLast = spreadStart === finalSpread(document.numPages);
    if (direction < 0 && atFirst && catalogueIndex === 0) return;
    if (direction > 0 && atLast && catalogueIndex === catalogues.length - 1) return;

    if (direction > 0 && atLast) {
      setTurn({direction, front: visible.right, back: null, target: 1});
      window.setTimeout(() => {
        setTurn(null);
        setCatalogueIndex(index => index + 1);
        setSpreadStart(1);
      }, TURN_DURATION);
      return;
    }
    if (direction < 0 && atFirst) {
      setTurn({direction, front: visible.left, back: null, target: 1});
      window.setTimeout(() => {
        openLastPageRef.current = true;
        setTurn(null);
        setCatalogueIndex(index => index - 1);
        setSpreadStart(1);
      }, TURN_DURATION);
      return;
    }

    const target = direction > 0
      ? (spreadStart === 1 ? 2 : spreadStart + 2)
      : (spreadStart <= 2 ? 1 : spreadStart - 2);
    const targetSpread = spreadPages(target, document.numPages);
    const front = direction > 0 ? visible.right : visible.left;
    const back = direction > 0 ? targetSpread.left : targetSpread.right;
    setStatus('Preparing the turning page…');
    await Promise.all([renderPageImage(front), renderPageImage(back), renderPageImage(targetSpread.left), renderPageImage(targetSpread.right)]);
    setStatus('');
    setTurn({direction, front, back, target});
    window.setTimeout(() => {
      setSpreadStart(target);
      setTurn(null);
    }, TURN_DURATION);
  }, [catalogueIndex, catalogues.length, document, renderPageImage, spreadStart, turn, visible.left, visible.right]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') void changePage(-1);
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        void changePage(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changePage, onClose]);

  useEffect(() => {
    onCatalogueChange(catalogueKey(catalogue, catalogueIndex));
  }, [catalogue, catalogueIndex, onCatalogueChange]);

  const ready = !document
    ? false
    : spreadStart === 1
      ? Boolean(renderedPages[1])
      : Boolean(visible.left && renderedPages[visible.left]) && Boolean(!visible.right || renderedPages[visible.right]);
  const targetSpread = turn && document ? spreadPages(turn.target, document.numPages) : null;
  const leftBase = turn?.direction === -1 ? targetSpread?.left : visible.left;
  const rightBase = turn?.direction === 1 ? targetSpread?.right : visible.right;
  const pageLabel = document
    ? spreadStart === 1
      ? `Cover · page 1 / ${document.numPages}`
      : `Pages ${visible.left}${visible.right ? `–${visible.right}` : ''} / ${document.numPages}`
    : 'Preparing pages';

  return <section className="catalogue-book" aria-label="Unified interactive catalogue book">
    <header className="catalogue-book__bar">
      <div><small>NK ELECTRICAL / UNIFIED CATALOGUES</small><strong>{catalogueLabel}</strong></div>
      <div className="catalogue-book__bar-actions">
        <button type="button" onClick={() => setShowContents(open => !open)} aria-expanded={showContents}>Collections</button>
        <button type="button" onClick={onClose} aria-label="Close catalogue book"><X/>Close</button>
      </div>
    </header>

    {showContents && <nav className="catalogue-book__contents" aria-label="Catalogue chapters">
      {catalogues.map((item, index) => <button type="button" className={index === catalogueIndex ? 'is-current' : ''} onClick={() => {
        openLastPageRef.current = false;
        setCatalogueIndex(index);
        setSpreadStart(1);
        setShowContents(false);
      }} key={catalogueKey(item, index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.name}</button>)}
    </nav>}

    <div className="catalogue-book__reader">
      <button type="button" className="catalogue-book__nav catalogue-book__nav--previous" onClick={() => void changePage(-1)} disabled={!document || Boolean(turn) || (catalogueIndex === 0 && spreadStart === 1)} aria-label="Previous page"><ChevronLeft/></button>

      <div className={`catalogue-book__stage ${spreadStart === 1 && !turn ? 'is-cover' : 'is-open'} ${turn ? `is-turning is-turning-${turn.direction > 0 ? 'forward' : 'backward'}` : ''}`}
        onTouchStart={event => { touchStart.current = event.changedTouches[0].clientX; }}
        onTouchEnd={event => {
          if (touchStart.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) > 45) void changePage(delta < 0 ? 1 : -1);
        }}>
        <div className="catalogue-book__thickness" aria-hidden="true"/>
        <div className="catalogue-book__spread" aria-live="polite">
          <button className="catalogue-book__leaf catalogue-book__leaf--left" type="button" onClick={() => void changePage(-1)} aria-label="Turn to previous page">
            {leftBase && renderedPages[leftBase] && <img src={renderedPages[leftBase]} alt={`${catalogueLabel}, page ${leftBase}`}/>}
          </button>
          <button className="catalogue-book__leaf catalogue-book__leaf--right" type="button" onClick={() => void changePage(1)} aria-label="Turn to next page">
            {rightBase && renderedPages[rightBase] && <img src={renderedPages[rightBase]} alt={`${catalogueLabel}, page ${rightBase}`}/>}
          </button>
          <span className="catalogue-book__spine" aria-hidden="true"/>
          {turn && <div className="catalogue-book__turning-sheet" aria-hidden="true">
            <div className="catalogue-book__turn-face catalogue-book__turn-face--front">
              {turn.front && renderedPages[turn.front] && <img src={renderedPages[turn.front]} alt=""/>}
            </div>
            <div className="catalogue-book__turn-face catalogue-book__turn-face--back">
              {turn.back && renderedPages[turn.back] && <img src={renderedPages[turn.back]} alt=""/>}
            </div>
          </div>}
        </div>
        {(!ready || status) && <p className="catalogue-book__status" role="status"><LoaderCircle/>{status || 'Preparing real catalogue pages…'}</p>}
      </div>

      <button type="button" className="catalogue-book__nav catalogue-book__nav--next" onClick={() => void changePage(1)} disabled={!document || Boolean(turn) || (catalogueIndex === catalogues.length - 1 && spreadStart === finalSpread(document?.numPages || 1))} aria-label="Next page"><ChevronRight/></button>
    </div>

    <footer className="catalogue-book__footer">
      <span>{pageLabel}</span>
      <span>Catalogue {catalogueIndex + 1} / {catalogues.length}</span>
      <p>Click a page, use the arrow keys, buttons or swipe. Each sheet turns across the centre spine.</p>
    </footer>
  </section>;
}
