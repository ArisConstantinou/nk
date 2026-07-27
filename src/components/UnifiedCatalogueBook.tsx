import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, X} from 'lucide-react';
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
  active: boolean;
  landed?: boolean;
  releasing?: boolean;
  catalogueDelta?: -1 | 1;
};

const MAX_CACHED_PAGES = 8;
const catalogueKey = (catalogue: Catalogue, index: number) => catalogue.id || `${catalogue.brand}-${catalogue.year}-${index}`;
const interactiveSelector = 'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="slider"], [role="menuitem"]';

function interactiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveSelector));
}

function editableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]'));
}

function withPdfFailure<T>(work: PromiseLike<T>, failure: Promise<never> | null) {
  const promise = Promise.resolve(work);
  return failure ? Promise.race([promise, failure]) : promise;
}

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
  const [isPreparingTurn, setIsPreparingTurn] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [renderedPages, setRenderedPages] = useState<Record<number, string>>({});
  const pageCacheRef = useRef(new Map<number, string>());
  const pageRenderRef = useRef(new Map<number, Promise<string>>());
  const activeDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const activeFailureRef = useRef<Promise<never> | null>(null);
  const activeAbortRef = useRef<(() => void | Promise<void>) | null>(null);
  const documentDestroyRef = useRef<Promise<void>>(Promise.resolve());
  const preparingTurnRef = useRef(false);
  const touchStart = useRef<number | null>(null);
  const openLastPageRef = useRef(false);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const collectionsButtonRef = useRef<HTMLButtonElement>(null);
  const catalogue = catalogues[catalogueIndex];
  const catalogueLabel = useMemo(() => `${catalogue.brand} · ${catalogue.name}`, [catalogue]);
  const visible = document ? spreadPages(spreadStart, document.numPages) : {left: null, right: null};

  useEffect(() => {
    setCatalogueIndex(initialIndex);
    setSpreadStart(1);
  }, [initialIndex]);

  useEffect(() => {
    let cancelled = false;
    const requestController = new AbortController();
    let abort: () => void | Promise<void> = () => requestController.abort();
    let loadedDocument: PDFDocumentProxy | null = null;
    activeDocumentRef.current = null;
    activeFailureRef.current = null;
    setDocument(null);
    setLoadError('');
    setTurn(null);
    preparingTurnRef.current = false;
    setIsPreparingTurn(false);
    setRenderedPages({});
    for (const image of pageCacheRef.current.values()) URL.revokeObjectURL(image);
    pageCacheRef.current.clear();
    pageRenderRef.current.clear();
    setStatus(`Loading ${catalogue.name}…`);
    void (async () => {
      try {
        await Promise.race([
          documentDestroyRef.current.catch(() => {}),
          new Promise<void>(resolve => window.setTimeout(resolve, 400)),
        ]);
        if (cancelled) return;
        const source = await createCataloguePdfTask(catalogue.url, requestController.signal);
        abort = () => {
          requestController.abort();
          source.abort();
        };
        activeAbortRef.current = abort;
        activeFailureRef.current = source.failure;
        const pdf = await source.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        loadedDocument = pdf;
        activeDocumentRef.current = pdf;
        const destination = openLastPageRef.current ? finalSpread(pdf.numPages) : 1;
        openLastPageRef.current = false;
        setSpreadStart(destination);
        setDocument(pdf);
        setStatus('');
      } catch {
        if (!cancelled) {
          void abort();
          activeAbortRef.current = null;
          activeFailureRef.current = null;
          setStatus('');
          setLoadError('The catalogue could not be loaded. Check the connection and try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
      documentDestroyRef.current = Promise.resolve(abort()).catch(() => {});
      if (activeAbortRef.current === abort) activeAbortRef.current = null;
      activeFailureRef.current = null;
      if (activeDocumentRef.current === loadedDocument) activeDocumentRef.current = null;
      for (const image of pageCacheRef.current.values()) URL.revokeObjectURL(image);
      pageCacheRef.current.clear();
      pageRenderRef.current.clear();
    };
  }, [catalogue.name, catalogue.url]);

  const failReader = useCallback((message: string) => {
    const abort = activeAbortRef.current;
    activeAbortRef.current = null;
    activeFailureRef.current = null;
    activeDocumentRef.current = null;
    void abort?.();
    preparingTurnRef.current = false;
    setIsPreparingTurn(false);
    setTurn(null);
    setDocument(null);
    setStatus('');
    setLoadError(message);
    for (const image of pageCacheRef.current.values()) URL.revokeObjectURL(image);
    pageCacheRef.current.clear();
    pageRenderRef.current.clear();
    setRenderedPages({});
  }, []);

  const retryCatalogue = useCallback(() => {
    window.location.reload();
  }, []);

  const renderPageImage = useCallback(async (pageNumber: number | null) => {
    if (!document || !pageNumber || pageNumber < 1 || pageNumber > document.numPages) return null;
    const cached = pageCacheRef.current.get(pageNumber);
    if (cached) {
      pageCacheRef.current.delete(pageNumber);
      pageCacheRef.current.set(pageNumber, cached);
      return cached;
    }
    const inFlight = pageRenderRef.current.get(pageNumber);
    if (inFlight) return inFlight;

    const sourceDocument = document;
    const sourceFailure = activeFailureRef.current;
    const rendering = (async () => {
      const page = await withPdfFailure(sourceDocument.getPage(pageNumber), sourceFailure);
      try {
        const base = page.getViewport({scale: 1});
        const targetHeight = window.innerWidth <= 760
          ? 600
          : Math.min(1080, Math.max(760, window.innerHeight * .9));
        const scale = Math.min(1.7, targetHeight / base.height);
        const viewport = page.getViewport({scale});
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', {alpha: false});
        if (!context) throw new Error('Canvas is unavailable.');
        await withPdfFailure(page.render({canvas, canvasContext: context, viewport}).promise, sourceFailure);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(result => result ? resolve(result) : reject(new Error('Page image conversion failed.')), 'image/webp', .88);
        });
        canvas.width = 1;
        canvas.height = 1;
        const image = URL.createObjectURL(blob);
        if (sourceDocument !== activeDocumentRef.current) {
          URL.revokeObjectURL(image);
          throw new Error('Catalogue changed while rendering.');
        }
        const decodedImage = new Image();
        decodedImage.decoding = 'async';
        decodedImage.src = image;
        try {
          await decodedImage.decode();
        } catch (error) {
          URL.revokeObjectURL(image);
          throw error;
        }
        if (sourceDocument !== activeDocumentRef.current) {
          URL.revokeObjectURL(image);
          throw new Error('Catalogue changed while decoding.');
        }
        pageCacheRef.current.set(pageNumber, image);
        setRenderedPages(current => current[pageNumber] ? current : {...current, [pageNumber]: image});
        return image;
      } finally {
        page.cleanup();
      }
    })().finally(() => {
      if (pageRenderRef.current.get(pageNumber) === rendering) pageRenderRef.current.delete(pageNumber);
    });
    pageRenderRef.current.set(pageNumber, rendering);
    return rendering;
  }, [document]);

  useEffect(() => {
    if (!document || turn) return;
    let cancelled = false;
    let preloadTimer: number | undefined;
    const currentSpread = spreadPages(spreadStart, document.numPages);
    const visiblePages = [currentSpread.left, currentSpread.right].filter((page): page is number => Boolean(page));
    const forwardPages = spreadStart === 1
      ? [2, 3]
      : [spreadStart + 2, spreadStart + 3];
    const backwardPages = spreadStart === 1 ? [] : [spreadStart - 2, spreadStart - 1];
    const nextPages = [...new Set(forwardPages.filter(page => page >= 1 && page <= document.numPages))];
    const previousPages = [...new Set(backwardPages.filter(page => page >= 1 && page <= document.numPages))];
    const preloadPages = [...new Set([...nextPages, ...previousPages])];
    const keepPages = new Set([...visiblePages, ...preloadPages]);

    for (const [page, image] of pageCacheRef.current) {
      if (keepPages.has(page) || pageCacheRef.current.size <= MAX_CACHED_PAGES) continue;
      URL.revokeObjectURL(image);
      pageCacheRef.current.delete(page);
      setRenderedPages(current => {
        const next = {...current};
        delete next[page];
        return next;
      });
    }

    void Promise.all(visiblePages.map(page => renderPageImage(page))).then(() => {
      if (cancelled) return;
      setStatus('');
      preloadTimer = window.setTimeout(() => {
        void Promise.all(nextPages.map(page => renderPageImage(page).catch(() => null))).then(() => {
          if (cancelled || previousPages.length === 0) return;
          preloadTimer = window.setTimeout(() => {
            void Promise.all(previousPages.map(page => renderPageImage(page).catch(() => null)));
          }, 160);
        });
      }, 120);
    }).catch(() => {
      if (!cancelled) failReader('A catalogue page could not be loaded. Check the connection and try again.');
    });
    return () => {
      cancelled = true;
      if (preloadTimer !== undefined) window.clearTimeout(preloadTimer);
    };
  }, [document, failReader, renderPageImage, spreadStart, turn]);

  const changePage = useCallback(async (direction: -1 | 1) => {
    if (!document || turn || preparingTurnRef.current) return;
    const atFirst = spreadStart === 1;
    const atLast = spreadStart === finalSpread(document.numPages);
    if (direction < 0 && atFirst && catalogueIndex === 0) return;
    if (direction > 0 && atLast && catalogueIndex === catalogues.length - 1) return;

    if (direction > 0 && atLast) {
      setTurn({direction, front: visible.right, back: null, target: 1, active: false, catalogueDelta: 1});
      return;
    }
    if (direction < 0 && atFirst) {
      setTurn({direction, front: visible.left, back: null, target: 1, active: false, catalogueDelta: -1});
      return;
    }

    const target = direction > 0
      ? (spreadStart === 1 ? 2 : spreadStart + 2)
      : (spreadStart <= 2 ? 1 : spreadStart - 2);
    const targetSpread = spreadPages(target, document.numPages);
    const front = direction > 0 ? visible.right : visible.left;
    const back = direction > 0 ? targetSpread.left : targetSpread.right;
    preparingTurnRef.current = true;
    setIsPreparingTurn(true);
    try {
      await Promise.all([renderPageImage(front), renderPageImage(back), renderPageImage(targetSpread.left), renderPageImage(targetSpread.right)]);
      setTurn({direction, front, back, target, active: false});
    } catch {
      failReader('A catalogue page could not be loaded. Check the connection and try again.');
    } finally {
      preparingTurnRef.current = false;
      setIsPreparingTurn(false);
    }
  }, [catalogueIndex, catalogues.length, document, failReader, renderPageImage, spreadStart, turn, visible.left, visible.right]);

  useEffect(() => {
    if (!turn || turn.active) return;
    const animationFrame = window.requestAnimationFrame(() => {
      setTurn(current => current && !current.active ? {...current, active: true} : current);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [turn]);

  const completeTurn = useCallback(() => {
    if (!turn?.active || turn.landed) return;
    if (turn.catalogueDelta === 1) {
      setCatalogueIndex(index => index + 1);
      setSpreadStart(1);
      setTurn(null);
    } else if (turn.catalogueDelta === -1) {
      openLastPageRef.current = true;
      setCatalogueIndex(index => index - 1);
      setSpreadStart(1);
      setTurn(null);
    } else {
      setSpreadStart(turn.target);
      setTurn(current => current?.active && !current.landed ? {...current, landed: true} : current);
    }
  }, [turn]);

  useEffect(() => {
    if (!turn?.landed || turn.releasing) return;
    let holdFrame = 0;
    const paintFrame = window.requestAnimationFrame(() => {
      holdFrame = window.requestAnimationFrame(() => {
        setTurn(current => current?.landed && !current.releasing ? {...current, releasing: true} : current);
      });
    });
    return () => {
      window.cancelAnimationFrame(paintFrame);
      if (holdFrame) window.cancelAnimationFrame(holdFrame);
    };
  }, [turn?.landed, turn?.releasing]);

  useEffect(() => {
    if (!turn?.releasing) return;
    const releaseTimer = window.setTimeout(() => {
      setTurn(current => current?.releasing ? null : current);
    }, 140);
    return () => window.clearTimeout(releaseTimer);
  }, [turn?.releasing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showContents) {
          event.preventDefault();
          setShowContents(false);
          collectionsButtonRef.current?.focus();
          return;
        }
        if (editableTarget(event.target)) return;
        onClose();
        return;
      }
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || editableTarget(event.target)) return;
      const target = event.target instanceof Element ? event.target : null;
      const pageControl = Boolean(target?.closest('.catalogue-book__nav, .catalogue-book__leaf'));
      if (showContents) return;
      if (event.key === 'ArrowLeft') {
        if (interactiveTarget(event.target) && !pageControl) return;
        event.preventDefault();
        void changePage(-1);
      }
      if (event.key === 'ArrowRight' || event.key === ' ') {
        if (interactiveTarget(event.target) && (event.key === ' ' || !pageControl)) return;
        event.preventDefault();
        void changePage(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changePage, onClose, showContents]);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) return;
    const resetPagePosition = () => { viewport.scrollLeft = 0; };
    const animationFrame = window.requestAnimationFrame(resetPagePosition);
    window.addEventListener('resize', resetPagePosition);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resetPagePosition);
    };
  }, [catalogueIndex, document]);

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
    : loadError ? 'Catalogue unavailable' : 'Preparing pages';
  const readerBusy = Boolean(turn) || isPreparingTurn;
  const previousUnavailable = !document || (catalogueIndex === 0 && spreadStart === 1);
  const nextUnavailable = !document || (catalogueIndex === catalogues.length - 1 && spreadStart === finalSpread(document?.numPages || 1));

  return <section className="catalogue-book" aria-label="Unified interactive catalogue book">
    <header className="catalogue-book__bar">
      <div><small>NK ELECTRICAL / UNIFIED CATALOGUES</small><strong>{catalogueLabel}</strong></div>
      <div className="catalogue-book__bar-actions">
        <button ref={collectionsButtonRef} type="button" onClick={() => setShowContents(open => !open)} aria-expanded={showContents} disabled={Boolean(turn) || isPreparingTurn}>Collections</button>
        <button type="button" onClick={onClose} aria-label="Close catalogue book"><X/>Close</button>
      </div>
    </header>

    {showContents && <nav className="catalogue-book__contents" aria-label="Catalogue chapters">
      {catalogues.map((item, index) => <button type="button" className={index === catalogueIndex ? 'is-current' : ''} onClick={() => {
        openLastPageRef.current = false;
        preparingTurnRef.current = false;
        setIsPreparingTurn(false);
        setTurn(null);
        setCatalogueIndex(index);
        setSpreadStart(1);
        setShowContents(false);
      }} key={catalogueKey(item, index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.name}</button>)}
    </nav>}

    <div className="catalogue-book__reader">
      <button type="button" className="catalogue-book__nav catalogue-book__nav--previous" onClick={() => void changePage(-1)} disabled={previousUnavailable} aria-disabled={previousUnavailable || readerBusy} aria-label="Previous page"><ChevronLeft/></button>

      <div className="catalogue-book__stage-viewport" ref={stageViewportRef}>
      <div className={`catalogue-book__stage ${spreadStart === 1 && !turn ? 'is-cover' : 'is-open'} ${turn ? `has-turning-sheet has-turning-sheet-${turn.direction > 0 ? 'forward' : 'backward'} ${turn.active ? `is-turning is-turning-${turn.direction > 0 ? 'forward' : 'backward'}` : ''} ${turn.landed ? 'is-turn-landed' : ''} ${turn.releasing ? 'is-turn-releasing' : ''}` : ''}`}
        aria-busy={!loadError && (!ready || isPreparingTurn)}
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
          {turn && <div className="catalogue-book__turning-sheet" aria-hidden="true" onAnimationEnd={event => {
            if (event.target !== event.currentTarget || !event.animationName.startsWith('catalogue-turn-')) return;
            completeTurn();
          }}>
            <div className="catalogue-book__turn-face catalogue-book__turn-face--front">
              {turn.front && renderedPages[turn.front] && <img src={renderedPages[turn.front]} alt=""/>}
            </div>
            <div className="catalogue-book__turn-face catalogue-book__turn-face--back">
              {turn.back && renderedPages[turn.back] && <img src={renderedPages[turn.back]} alt=""/>}
            </div>
          </div>}
        </div>
        {loadError
          ? <div className="catalogue-book__status catalogue-book__status--error" role="alert"><AlertTriangle/><strong>{loadError}</strong><button type="button" onClick={retryCatalogue}><RefreshCw/>Retry</button></div>
          : (!ready || status) && <p className="catalogue-book__status" role="status"><LoaderCircle/>{status || 'Preparing real catalogue pages…'}</p>}
      </div>
      </div>

      <button type="button" className="catalogue-book__nav catalogue-book__nav--next" onClick={() => void changePage(1)} disabled={nextUnavailable} aria-disabled={nextUnavailable || readerBusy} aria-label="Next page"><ChevronRight/></button>
    </div>

    <footer className="catalogue-book__footer">
      <span>{pageLabel}</span>
      <span>Catalogue {catalogueIndex + 1} / {catalogues.length}</span>
      <p>Tap a page, swipe, or use the arrow controls to keep reading.</p>
    </footer>
  </section>;
}
