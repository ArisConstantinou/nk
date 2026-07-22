import {
  ArrowRight,
  FileText,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import type {Catalogue, Product} from '../types';
import {ResponsiveImage} from './ResponsiveImage';
import './global-live-search.css';

type SearchResult =
  | {key: string; kind: 'product'; score: number; product: Product; to: string}
  | {key: string; kind: 'catalogue'; score: number; catalogue: Catalogue; to: string};

type LiveSearchLabels = {
  input: string;
  placeholder: string;
  clear: string;
  products: string;
  catalogues: string;
  suggested: string;
  noResults: string;
  noResultsHint: string;
  product: string;
  catalogue: string;
  openPdf: string;
  keyboardHint: string;
};

export type GlobalLiveSearchProps = {
  className?: string;
  maxResults?: number;
  labels?: Partial<LiveSearchLabels>;
  onDismiss?: () => void;
  onNavigate?: () => void;
  autoFocus?: boolean;
};

const defaultLabels: LiveSearchLabels = {
  input: 'Search products and catalogues',
  placeholder: 'Search products, catalogues & PDFs',
  clear: 'Clear search',
  products: 'Products',
  catalogues: 'Catalogues & PDFs',
  suggested: 'Quick access',
  noResults: 'No close match found',
  noResultsHint: 'Try a product name, category, brand or year.',
  product: 'Product',
  catalogue: 'PDF catalogue',
  openPdf: 'Open PDF',
  keyboardHint: 'Use arrow keys to move and Enter to open',
};

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘`]/g, "'")
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();

const words = (value: string) => normalize(value).split(' ').filter(Boolean);

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({length: b.length + 1}, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function fieldScore(query: string, value: string, weight: number) {
  const target = normalize(value);
  if (!target) return 0;
  const queryTokens = words(query);
  const targetTokens = target.split(' ');
  let score = 0;

  if (target === query) score += 120;
  else if (target.startsWith(query)) score += 82;
  else if (target.includes(query)) score += 34;

  let matchedTokens = 0;
  queryTokens.forEach(token => {
    if (targetTokens.includes(token)) {
      score += 28;
      matchedTokens += 1;
      return;
    }
    if (targetTokens.some(candidate => candidate.startsWith(token))) {
      score += 19;
      matchedTokens += 1;
      return;
    }
    if (target.includes(token)) {
      score += 10;
      matchedTokens += 1;
      return;
    }
    if (token.length < 4) return;
    const close = targetTokens.some(candidate => {
      if (Math.abs(candidate.length - token.length) > 2) return false;
      const tolerance = token.length >= 7 ? 2 : 1;
      return editDistance(token, candidate) <= tolerance;
    });
    if (close) {
      score += 8;
      matchedTokens += 1;
    }
  });

  if (matchedTokens === queryTokens.length && queryTokens.length > 1) score += 25;
  return score * weight;
}

function productScore(query: string, product: Product) {
  return fieldScore(query, product.name, 3.4)
    + fieldScore(query, product.category, 1.8)
    + fieldScore(query, product.space, 1.3)
    + fieldScore(query, product.season, 0.8)
    + fieldScore(query, product.note, 0.65)
    + fieldScore(query, product.id, 0.55);
}

function catalogueScore(query: string, catalogue: Catalogue) {
  return fieldScore(query, catalogue.name, 3.4)
    + fieldScore(query, catalogue.brand, 2.2)
    + fieldScore(query, catalogue.focus, 1.5)
    + fieldScore(query, catalogue.year, 1.4)
    + fieldScore(query, 'pdf catalogue download', 0.7);
}

function ResultTypeIcon({result}: {result: SearchResult}) {
  if (result.kind === 'catalogue') {
    return <span className="nk-live-search__document" aria-hidden="true"><FileText/><small>PDF</small></span>;
  }
  return (
    <span className="nk-live-search__thumbnail" aria-hidden="true">
      <ResponsiveImage src={result.product.image} alt="" loading="lazy"/>
    </span>
  );
}

function ResultCopy({result, labels}: {result: SearchResult; labels: LiveSearchLabels}) {
  if (result.kind === 'catalogue') {
    const {catalogue} = result;
    return <><span><small>{labels.catalogue}</small><strong>{catalogue.name}</strong><em>{catalogue.brand} · {catalogue.focus} · {catalogue.year}</em></span><span className="nk-live-search__result-action">{labels.openPdf}<ArrowRight/></span></>;
  }
  const {product} = result;
  return <><span><small>{labels.product}</small><strong>{product.name}</strong><em>{product.category} · {product.space}{product.offer ? ' · Offer' : ''}</em></span><ArrowRight className="nk-live-search__result-arrow" aria-hidden="true"/></>;
}

export function GlobalLiveSearch({className = '', maxResults = 8, labels: labelOverrides, onDismiss, onNavigate, autoFocus = false}: GlobalLiveSearchProps) {
  const {content} = useContent();
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const labels = useMemo(() => ({...defaultLabels, ...labelOverrides}), [labelOverrides]);

  const results = useMemo<SearchResult[]>(() => {
    const normalizedQuery = normalize(deferredQuery);
    if (!normalizedQuery) {
      const products = content.products.slice(0, Math.min(4, maxResults)).map((product, index): SearchResult => ({
        key: `product-${product.id}`,
        kind: 'product',
        score: 100 - index,
        product,
        to: `/shop/product/${encodeURIComponent(product.id)}`,
      }));
      const remaining = Math.max(0, maxResults - products.length);
      const catalogues = content.catalogues.slice(0, remaining).map((catalogue, index): SearchResult => ({
        key: `catalogue-${catalogue.id || index}-${catalogue.name}`,
        kind: 'catalogue',
        score: 50 - index,
        catalogue,
        to: catalogue.url,
      }));
      return [...products, ...catalogues];
    }

    const productResults = content.products.map((product): SearchResult => ({
      key: `product-${product.id}`,
      kind: 'product',
      score: productScore(normalizedQuery, product),
      product,
      to: `/shop/product/${encodeURIComponent(product.id)}`,
    }));
    const catalogueResults = content.catalogues.map((catalogue, index): SearchResult => ({
      key: `catalogue-${catalogue.id || index}-${catalogue.name}`,
      kind: 'catalogue',
      score: catalogueScore(normalizedQuery, catalogue),
      catalogue,
      to: catalogue.url,
    }));

    return [...productResults, ...catalogueResults]
      .filter(result => result.score >= 7)
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
      .slice(0, maxResults);
  }, [content.catalogues, content.products, deferredQuery, maxResults]);

  const grouped = useMemo(() => ({
    products: results.filter(result => result.kind === 'product'),
    catalogues: results.filter(result => result.kind === 'catalogue'),
  }), [results]);
  const orderedResults = useMemo(
    () => [...grouped.products, ...grouped.catalogues],
    [grouped.catalogues, grouped.products],
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const focusWithShortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key !== '/' || isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener('keydown', focusWithShortcut);
    return () => window.removeEventListener('keydown', focusWithShortcut);
  }, []);

  useEffect(() => {
    setActiveIndex(current => current >= orderedResults.length ? orderedResults.length - 1 : current);
  }, [orderedResults.length]);

  useEffect(() => {
    if (activeIndex < 0) return;
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-search-result-index="${activeIndex}"]`)
      ?.scrollIntoView({block: 'nearest'});
  }, [activeIndex]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
    onNavigate?.();
  };

  const openResult = (result: SearchResult) => {
    if (result.kind === 'catalogue') window.open(result.to, '_blank', 'noopener,noreferrer');
    else navigate(result.to);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      onDismiss?.();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      setActiveIndex(current => orderedResults.length ? (current + 1) % orderedResults.length : -1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      setActiveIndex(current => orderedResults.length ? (current <= 0 ? orderedResults.length - 1 : current - 1) : -1);
      return;
    }
    if (event.key === 'Enter' && open && orderedResults.length) {
      event.preventDefault();
      event.stopPropagation();
      openResult(orderedResults[activeIndex >= 0 ? activeIndex : 0]);
    }
  };
  let optionIndex = -1;

  return (
    <div ref={rootRef} className={`nk-live-search ${open ? 'is-open' : ''} ${className}`.trim()}>
      <div className="nk-live-search__field">
        <Search aria-hidden="true"/>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={labels.placeholder}
          aria-label={labels.input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          onFocus={() => window.requestAnimationFrame(() => setOpen(true))}
          onChange={event => {setQuery(event.target.value); setOpen(true); setActiveIndex(-1);}}
          onKeyDown={onKeyDown}
        />
        {query ? <button type="button" className="nk-live-search__clear" aria-label={labels.clear} onClick={() => {setQuery(''); setActiveIndex(-1); inputRef.current?.focus();}}><X/></button> : <kbd>/</kbd>}
      </div>

      {open && <div className="nk-live-search__panel" id={listId} role="listbox" aria-label={labels.input}>
        <header className="nk-live-search__panel-head">
          <span><Sparkles aria-hidden="true"/>{query ? `Matches for “${query}”` : labels.suggested}</span>
          <small>{labels.keyboardHint}</small>
        </header>

        {!results.length ? (
          <div className="nk-live-search__empty" role="status"><Search/><strong>{labels.noResults}</strong><span>{labels.noResultsHint}</span></div>
        ) : (
          <div className="nk-live-search__groups">
            {(['products', 'catalogues'] as const).map(group => grouped[group].length ? (
              <section className="nk-live-search__group" key={group} aria-label={labels[group]}>
                <h2>{labels[group]}<span>{String(grouped[group].length).padStart(2, '0')}</span></h2>
                <div>
                  {grouped[group].map(result => {
                    optionIndex += 1;
                    const currentIndex = optionIndex;
                    const commonProps = {
                      id: `${listId}-option-${currentIndex}`,
                      'data-search-result-index': currentIndex,
                      className: `nk-live-search__result ${currentIndex === activeIndex ? 'is-active' : ''}`,
                      role: 'option',
                      'aria-selected': currentIndex === activeIndex,
                      onMouseEnter: () => setActiveIndex(currentIndex),
                      onClick: close,
                    } as const;
                    return result.kind === 'catalogue'
                      ? <a {...commonProps} href={result.to} target="_blank" rel="noreferrer" key={result.key}><ResultTypeIcon result={result}/><ResultCopy result={result} labels={labels}/></a>
                      : <Link {...commonProps} to={result.to} key={result.key}><ResultTypeIcon result={result}/><ResultCopy result={result} labels={labels}/></Link>;
                  })}
                </div>
              </section>
            ) : null)}
          </div>
        )}
      </div>}
    </div>
  );
}
