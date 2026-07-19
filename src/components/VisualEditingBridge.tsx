import {useEffect, useMemo, useRef} from 'react';
import {ArrowRight, ArrowUpRight, BookOpen, Box, Check, ChevronDown, CircuitBoard, ExternalLink, FileText, Gauge, Lightbulb, Link as LinkIcon, Mail, MapPin, Menu, Phone, PlugZap, Settings, Share2, Shield, ShieldCheck, SlidersHorizontal, Sparkles, Waves, Wrench, X, Zap, type LucideIcon} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {useContent, type VisualFontFamily, type VisualOverrideEntry, type VisualOverrideMap, type VisualRecord} from '../context/ContentContext';
import {LIVE_EDITOR_COMMAND_EVENT, LIVE_EDITOR_MESSAGE_EVENT, LIVE_EDITOR_NONCE} from './liveEditorEvents';

type VisualMessage = Record<string, unknown> & {type: string};
type VisualElement = HTMLElement | SVGElement;
type PointerDragState = {source: VisualElement; startX: number; startY: number; originX: number; originY: number; startRect: DOMRect; neighbors: DOMRect[]; active: boolean};
const automaticBaseText = new WeakMap<Node, string>();
const automaticOrigins = new WeakMap<Element, {parent: Node; nextSibling: ChildNode | null}>();
const automaticallyPlaced = new WeakSet<Element>();

const readVisualTarget = (target: EventTarget | null) => target instanceof Element && !target.closest('[data-visual-no-edit]')
  ? target.closest<VisualElement>('[data-visual-kind][data-visual-slug][data-visual-path]')
  : null;
const blurVisualElement = (element: VisualElement | null) => {
  if (element instanceof HTMLElement) element.blur();
  else (element as SVGElement & {blur?: () => void} | null)?.blur?.();
};

const visualIcons: Record<string, LucideIcon> = {
  'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight, 'book-open': BookOpen, box: Box, check: Check, 'chevron-down': ChevronDown, circuit: CircuitBoard, 'circuit-board': CircuitBoard, 'external-link': ExternalLink, 'file-text': FileText, gauge: Gauge, lightbulb: Lightbulb, link: LinkIcon, mail: Mail, 'map-pin': MapPin, menu: Menu, phone: Phone, 'plug-zap': PlugZap, settings: Settings, share: Share2, shield: Shield, 'shield-check': ShieldCheck, sliders: SlidersHorizontal, 'sliders-horizontal': SlidersHorizontal, sparkles: Sparkles, waves: Waves, wrench: Wrench, x: X, zap: Zap,
};

const safeVisualUrl = (value: string, type: 'href' | 'src') => {
  const text = value.trim();
  if (!text || /[\u0000-\u001f\u007f]/.test(text)) return '';
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  if (type === 'href' && (text.startsWith('#') || /^(?:mailto|tel):[^\s]+$/i.test(text))) return text;
  try {const url = new URL(text); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';}
  catch {return '';}
};

const elementPath = (element: Element, root: Element) => {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const siblings = current.parentElement ? [...current.parentElement.children].filter(item => item.tagName === current!.tagName) : [current];
    parts.push(`${current.tagName.toLowerCase()}:${Math.max(0, siblings.indexOf(current))}`);
    current = current.parentElement;
  }
  parts.push(root.tagName.toLowerCase());
  return parts.reverse().join('/');
};

const visualHash = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193);}
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const positionKeyFor = (element: VisualElement) => {
  const type = element.dataset.visualObjectType || '';
  const id = element.dataset.visualObjectId || '';
  if (type && type !== 'auto' && id) return visualHash(`${type}:${id}`);
  const path = element.dataset.visualPath || '';
  const automaticPath = path.match(/^visualOverrides\.([a-f0-9]{8,16})\./i);
  if (path && !automaticPath) return visualHash(`binding:${element.dataset.visualKind || ''}:${element.dataset.visualSlug || ''}:${path}`);
  return automaticPath?.[1] || element.dataset.visualAutoKey || id;
};

const movementTargetFor = (element: VisualElement | null): VisualElement | null => {
  if (!element) return null;
  const type = element.dataset.visualObjectType || '';
  const id = element.dataset.visualObjectId || '';
  if (type !== 'section' && type !== 'component') return element;
  let current: Element | null = element;
  while (current) {
    if ((current instanceof HTMLElement || current instanceof SVGElement) && current.dataset.visualObjectType === type && current.dataset.visualObjectId === id && current.dataset.visualDraggable === 'true' && !current.classList.contains('cms-builder-drag-handle')) return current;
    current = current.parentElement;
  }
  return [...document.querySelectorAll<VisualElement>('[data-visual-draggable="true"]')].find(candidate => candidate.dataset.visualObjectType === type && candidate.dataset.visualObjectId === id && !candidate.classList.contains('cms-builder-drag-handle')) || element;
};

const positionOf = (element: VisualElement | null) => ({
  x: Math.round(Number(element?.dataset.visualPositionX) || 0),
  y: Math.round(Number(element?.dataset.visualPositionY) || 0),
});

const applyPosition = (element: VisualElement, x: number, y: number) => {
  const safeX = Math.max(-4000, Math.min(4000, Math.round(x)));
  const safeY = Math.max(-4000, Math.min(4000, Math.round(y)));
  element.dataset.visualPositionX = String(safeX);
  element.dataset.visualPositionY = String(safeY);
  element.style.translate = safeX || safeY ? `${safeX}px ${safeY}px` : '';
};

const visualFontStacks: Record<VisualFontFamily, string> = {
  display: "var(--display, 'Manrope', Arial, sans-serif)",
  body: "'DM Sans', Arial, sans-serif",
  mono: "var(--mono, 'Courier New', monospace)",
  serif: "Georgia, 'Times New Roman', serif",
};

const applyTypography = (element: HTMLElement, override?: VisualOverrideEntry) => {
  if (element.dataset.visualBaseTypographyReady !== 'true') {
    element.dataset.visualBaseTypographyReady = 'true';
    element.dataset.visualBaseFontFamilyInline = element.style.fontFamily;
    element.dataset.visualBaseFontSizeInline = element.style.fontSize;
    element.dataset.visualBaseTextAlignInline = element.style.textAlign;
  }
  element.style.fontFamily = override?.fontFamily ? visualFontStacks[override.fontFamily] : element.dataset.visualBaseFontFamilyInline || '';
  element.style.fontSize = typeof override?.fontSize === 'number' ? `${override.fontSize}px` : element.dataset.visualBaseFontSizeInline || '';
  element.style.textAlign = override?.textAlign || element.dataset.visualBaseTextAlignInline || '';
};

const backgroundImageUrl = (value: string) => {
  const match = /url\((['"]?)(.*?)\1\)/i.exec(value);
  return match?.[2] || '';
};

const inferIconName = (element: Element) => [...element.classList].find(name => name.startsWith('lucide-') && name !== 'lucide')?.slice(7) || 'check';
type LucideRenderable = {render?: (props: Record<string, unknown>, ref: null) => {props?: {iconNode?: Array<[string, Record<string, string>]>}}};

const applyIcon = (element: SVGElement, name: string) => {
  const Icon = visualIcons[name];
  if (!Icon) return;
  const rendered = (Icon as unknown as LucideRenderable).render?.({}, null);
  const nodes = rendered?.props?.iconNode;
  if (!Array.isArray(nodes)) return;
  element.replaceChildren(...nodes.map(([tag, attributes]) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([attribute, value]) => {if (attribute !== 'key') node.setAttribute(attribute, String(value));});
    return node;
  }));
  [...element.classList].filter(className => className.startsWith('lucide-') && className !== 'lucide').forEach(className => element.classList.remove(className));
  element.classList.add(`lucide-${name}`);
};

const isAutomaticCandidate = (element: Element) => {
  if (element.matches('script, style, option, source, br, hr')) return false;
  if (element.closest('[data-visual-no-edit]')) return false;
  const existingBinding = element.closest<HTMLElement>('[data-visual-kind][data-visual-path]');
  if (existingBinding && existingBinding.dataset.visualAuto !== 'true') return false;
  return true;
};
const setVisualHidden = (element: HTMLElement | SVGElement, hidden: boolean) => {if (element instanceof HTMLElement) element.hidden = hidden; else element.style.display = hidden ? 'none' : '';};
const removeAutomaticTextWrappers = () => {
  document.querySelectorAll<HTMLElement>('[data-visual-auto-wrapper="true"]').forEach(wrapper => {
    wrapper.replaceWith(document.createTextNode(wrapper.textContent || ''));
  });
};

function prepareAutomaticContent({nonce, routeRecord, settingsRecord, allRecords}: {nonce: string | null; routeRecord?: VisualRecord; settingsRecord?: VisualRecord; allRecords: Record<string, VisualRecord>}) {
  const roots = [...document.querySelectorAll<HTMLElement>('header, main, footer')].filter(root => !root.parentElement?.closest('header, main, footer'));
  roots.forEach(root => {
    const record = root.tagName === 'MAIN' ? routeRecord : settingsRecord;
    if (!record) return;
    const overrides: VisualOverrideMap = record.overrides || {};
    const keyFor = (element: Element) => {
      if (!automaticOrigins.has(element) && element.parentNode) automaticOrigins.set(element, {parent: element.parentNode, nextSibling: element.nextSibling});
      const existing = element instanceof HTMLElement || element instanceof SVGElement ? element.dataset.visualAutoKey : '';
      const key = existing || visualHash(elementPath(element, root));
      if (element instanceof HTMLElement || element instanceof SVGElement) element.dataset.visualAutoKey = key;
      return key;
    };
    const pathFor = (element: Element, field: 'text' | 'src' | 'href' | 'icon') => {
      const key = keyFor(element);
      return {key, path: `visualOverrides.${key}.${field}`, value: overrides[key]?.[field]};
    };
    const decorate = (element: HTMLElement | SVGElement, field: 'text' | 'src' | 'icon', label: string, link?: HTMLAnchorElement | null, fallbackValue = '') => {
      const target = pathFor(element, field);
      const containerKey = element.parentElement ? keyFor(element.parentElement) : '';
      setVisualHidden(element, overrides[target.key]?.hidden === true);
      if (field === 'text' && element instanceof HTMLElement) applyTypography(element, overrides[target.key]);
      if (!nonce) return;
      element.dataset.visualAuto = 'true'; element.dataset.visualKind = record.kind; element.dataset.visualSlug = record.slug; element.dataset.visualPath = target.path; element.dataset.visualEdit = field === 'src' ? 'image' : field; element.dataset.visualLabel = label; element.dataset.visualObjectType = 'auto'; element.dataset.visualObjectId = target.key; element.dataset.visualSectionId = containerKey; element.dataset.visualDraggable = 'true';
      if (fallbackValue) element.dataset.visualFallbackValue = fallbackValue;
      if (element.parentElement) element.parentElement.dataset.visualContainerKey = containerKey;
      if (link) element.dataset.visualLinkPath = pathFor(link, 'href').path;
    };
    const decorateObject = (element: HTMLElement, label: string) => {
      const key = keyFor(element); const containerKey = element.parentElement ? keyFor(element.parentElement) : '';
      element.hidden = overrides[key]?.hidden === true;
      if (!nonce || element.hasAttribute('data-visual-path')) return;
      element.dataset.visualAuto = 'true'; element.dataset.visualKind = record.kind; element.dataset.visualSlug = record.slug; element.dataset.visualPath = `visualOverrides.${key}.hidden`; element.dataset.visualEdit = 'component'; element.dataset.visualLabel = label; element.dataset.visualObjectType = 'auto'; element.dataset.visualObjectId = key; element.dataset.visualSectionId = containerKey; element.dataset.visualDraggable = 'true';
      if (element.parentElement) element.parentElement.dataset.visualContainerKey = containerKey;
      if (element instanceof HTMLAnchorElement) element.dataset.visualLinkPath = pathFor(element, 'href').path;
    };
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
      const target = pathFor(anchor, 'href');
      if (anchor.dataset.visualBaseHref === undefined) anchor.dataset.visualBaseHref = anchor.getAttribute('href') || '';
      if (typeof target.value === 'string') {
        const href = safeVisualUrl(target.value, 'href');
        if (href && anchor.getAttribute('href') !== href) anchor.setAttribute('href', href);
        if (href) anchor.dataset.visualHrefApplied = 'true';
      } else if (anchor.dataset.visualHrefApplied === 'true') {
        if (anchor.dataset.visualBaseHref) anchor.setAttribute('href', anchor.dataset.visualBaseHref); else anchor.removeAttribute('href');
        delete anchor.dataset.visualHrefApplied;
      }
    });
    root.querySelectorAll<HTMLElement | SVGElement>('[data-visual-kind][data-visual-slug][data-visual-path]').forEach(element => {
      if (element.dataset.visualAuto === 'true') return;
      const bindingRecord = allRecords[`${element.dataset.visualKind}:${element.dataset.visualSlug}`] || record;
      const key = keyFor(element);
      setVisualHidden(element, bindingRecord.overrides?.[key]?.hidden === true);
      if (element instanceof HTMLElement && element.dataset.visualEdit === 'text') applyTypography(element, bindingRecord.overrides?.[key]);
      if (!nonce) return;
      const containerKey = element.parentElement ? keyFor(element.parentElement) : '';
      element.dataset.visualAutoKey = key;
      element.dataset.visualObjectType ||= 'auto';
      element.dataset.visualObjectId ||= key;
      element.dataset.visualSectionId ||= containerKey;
      element.dataset.visualDraggable = 'true';
      element.dataset.visualLabel ||= element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 54) || 'Website element';
      if (element.parentElement) element.parentElement.dataset.visualContainerKey = containerKey;
    });
    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (!(element instanceof HTMLElement) || element.childElementCount === 0 || element.dataset.visualAutoWrapper === 'true' || !isAutomaticCandidate(element)) return;
      [...element.childNodes].forEach((node, nodeIndex) => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return;
        if (!automaticBaseText.has(node)) automaticBaseText.set(node, node.textContent || '');
        const key = visualHash(`${elementPath(element, root)}/#text:${nodeIndex}`);
        const directOverride = overrides[key];
        const placement = record.placements?.[key];
        const hasTypography = Boolean(directOverride?.fontFamily || directOverride?.fontSize || directOverride?.textAlign);
        if (!nonce && !placement && !hasTypography) {
          if (directOverride?.hidden === true) node.textContent = '';
          else if (typeof directOverride?.text === 'string' && node.textContent !== directOverride.text) node.textContent = directOverride.text;
          else if (typeof directOverride?.text !== 'string') node.textContent = automaticBaseText.get(node) || node.textContent;
          return;
        }
        const wrapper = document.createElement('span');
        wrapper.dataset.visualAutoWrapper = 'true'; wrapper.dataset.visualAutoKey = key; wrapper.textContent = node.textContent;
        element.replaceChild(wrapper, node);
      });
    });
    root.querySelectorAll<HTMLImageElement>('img').forEach(image => {
      if (!isAutomaticCandidate(image)) return;
      const target = pathFor(image, 'src');
      if (image.dataset.visualBaseSrc === undefined) image.dataset.visualBaseSrc = image.getAttribute('src') || '';
      let renderedSrc = image.getAttribute('src') || image.dataset.visualBaseSrc;
      if (typeof target.value === 'string') {
        const src = safeVisualUrl(target.value, 'src');
        if (src && image.getAttribute('src') !== src) image.setAttribute('src', src);
        if (src) {image.dataset.visualSrcApplied = 'true'; renderedSrc = src;}
      } else if (image.dataset.visualSrcApplied === 'true') {
        if (image.dataset.visualBaseSrc) image.setAttribute('src', image.dataset.visualBaseSrc); else image.removeAttribute('src');
        delete image.dataset.visualSrcApplied;
        renderedSrc = image.dataset.visualBaseSrc;
      }
      decorate(image, 'src', image.alt ? `Image: ${image.alt}` : 'Image', image.closest<HTMLAnchorElement>('a[href]'), renderedSrc);
    });
    root.querySelectorAll<SVGElement>('svg.lucide').forEach(icon => {
      if (!isAutomaticCandidate(icon)) return;
      const target = pathFor(icon, 'icon');
      icon.dataset.visualBaseIcon ||= inferIconName(icon);
      if (typeof target.value === 'string' && inferIconName(icon) !== target.value) {applyIcon(icon, target.value); icon.dataset.visualIconApplied = 'true';}
      else if (typeof target.value !== 'string' && icon.dataset.visualIconApplied === 'true') {applyIcon(icon, icon.dataset.visualBaseIcon); delete icon.dataset.visualIconApplied;}
      decorate(icon, 'icon', `Icon: ${inferIconName(icon)}`, icon.closest<HTMLAnchorElement>('a[href]'));
    });
    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (!(element instanceof HTMLElement) || !isAutomaticCandidate(element) || element.childElementCount > 0) return;
      const text = element.innerText.replace(/\r/g, '').trim();
      if (!text) return;
      const target = pathFor(element, 'text');
      if (element.dataset.visualBaseText === undefined) element.dataset.visualBaseText = element.innerText.replace(/\r/g, '');
      if (typeof target.value === 'string' && element.innerText.replace(/\r/g, '') !== target.value) {element.innerText = target.value; element.dataset.visualTextApplied = 'true';}
      else if (typeof target.value !== 'string' && element.dataset.visualTextApplied === 'true') {element.innerText = element.dataset.visualBaseText; delete element.dataset.visualTextApplied;}
      decorate(element, 'text', text.length > 54 ? `${text.slice(0, 51)}…` : text, element.closest<HTMLAnchorElement>('a[href]'));
    });
    root.querySelectorAll<HTMLElement>('a[href], button, article, li, input, textarea, select, canvas, video, audio').forEach(element => {
      const standaloneControl = element.matches('input, textarea, select, canvas, video, audio');
      if ((!standaloneControl && element.childElementCount === 0) || !isAutomaticCandidate(element)) return;
      const text = element.innerText.replace(/\s+/g, ' ').trim();
      const controlLabel = element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name') || element.getAttribute('type') || '';
      decorateObject(element, controlLabel || (text.length > 54 ? `${text.slice(0, 51)}…` : text) || element.tagName.toLowerCase());
    });
    const decorateStructure = (element: HTMLElement, label: string) => {
      if (!isAutomaticCandidate(element)) return;
      if (element.hasAttribute('data-visual-path') && element.dataset.visualBackground !== 'true') {
        setVisualHidden(element, overrides[keyFor(element)]?.hidden === true);
        return;
      }
      if (element.dataset.visualBaseBackgroundReady !== 'true') {
        element.dataset.visualBaseBackgroundReady = 'true';
        element.dataset.visualBaseBackgroundInline = element.style.backgroundImage;
      }
      let currentBackground = backgroundImageUrl(getComputedStyle(element).backgroundImage);
      if (currentBackground) {
        const target = pathFor(element, 'src');
        const nextBackground = typeof target.value === 'string' ? safeVisualUrl(target.value, 'src') : '';
        if (nextBackground) {element.style.backgroundImage = `url(${JSON.stringify(nextBackground)})`; element.dataset.visualBackgroundApplied = 'true'; currentBackground = nextBackground;}
        else if (element.dataset.visualBackgroundApplied === 'true') {
          element.style.backgroundImage = element.dataset.visualBaseBackgroundInline || '';
          delete element.dataset.visualBackgroundApplied;
          currentBackground = backgroundImageUrl(getComputedStyle(element).backgroundImage);
        }
        element.dataset.visualBackground = 'true';
        decorate(element, 'src', `Background image: ${label}`, element.closest<HTMLAnchorElement>('a[href]'), nextBackground || currentBackground);
        return;
      }
      decorateObject(element, label);
    };
    root.querySelectorAll<HTMLElement>('section, div, nav, aside, figure, figcaption, ul, ol, dl, dt, dd, table, thead, tbody, tfoot, tr, td, th, form, fieldset, legend, label, address, blockquote, details, summary, h1, h2, h3, h4, h5, h6, p, span, strong, em, b, i, small, code, pre, hr').forEach(element => {
      const text = element.innerText.replace(/\s+/g, ' ').trim();
      const classLabel = typeof element.className === 'string' ? element.className.split(/\s+/).filter(Boolean).slice(0, 2).join(' ') : '';
      decorateStructure(element, element.getAttribute('aria-label') || (text.length > 54 ? `${text.slice(0, 51)}…` : text) || classLabel || element.tagName.toLowerCase());
    });
    decorateStructure(root, root.tagName === 'MAIN' ? 'Page content' : root.tagName === 'HEADER' ? 'Website header' : 'Website footer');
  });
  const renderedRecordKeys = new Set([...document.querySelectorAll<HTMLElement | SVGElement>('[data-visual-kind][data-visual-slug]')].map(element => `${element.dataset.visualKind}:${element.dataset.visualSlug}`));
  const placementCandidates = [routeRecord, settingsRecord, ...[...renderedRecordKeys].map(key => allRecords[key])];
  const placementRecords = placementCandidates.filter((record, index, records): record is VisualRecord => Boolean(record) && records.findIndex(candidate => candidate?.kind === record?.kind && candidate?.slug === record?.slug) === index);
  const placementEntries = placementRecords.flatMap(record => Object.entries(record.placements || {}));
  const activePlacementKeys = new Set(placementEntries.map(([sourceKey]) => sourceKey));
  document.querySelectorAll<HTMLElement | SVGElement>('[data-visual-auto-key]').forEach(element => {
    if (!automaticallyPlaced.has(element) || activePlacementKeys.has(element.dataset.visualAutoKey || '')) return;
    const origin = automaticOrigins.get(element);
    if (origin?.parent.isConnected) origin.parent.insertBefore(element, origin.nextSibling?.parentNode === origin.parent ? origin.nextSibling : null);
    automaticallyPlaced.delete(element);
  });
  placementEntries.forEach(([sourceKey, placement]) => {
    const source = document.querySelector<HTMLElement | SVGElement>(`[data-visual-auto-key="${sourceKey}"]`);
    const target = document.querySelector<HTMLElement | SVGElement>(`[data-visual-auto-key="${placement.target}"]`);
    if (!source || !target || source === target || source.contains(target) || !target.parentElement) return;
    const alreadyPlaced = placement.position === 'before' ? source.nextElementSibling === target : target.nextElementSibling === source;
    if (alreadyPlaced) {automaticallyPlaced.add(source); return;}
    target.parentElement.insertBefore(source, placement.position === 'before' ? target : target.nextSibling);
    automaticallyPlaced.add(source);
  });
  document.querySelectorAll<VisualElement>('[data-visual-draggable="true"]').forEach(element => {
    const record = allRecords[`${element.dataset.visualKind}:${element.dataset.visualSlug}`];
    const positionKey = positionKeyFor(element);
    if (!record || !positionKey) return;
    const position = record.overrides?.[positionKey];
    if (element instanceof HTMLElement && element.dataset.visualEdit === 'text') applyTypography(element, position);
    if (element.classList.contains('cms-builder-drag-handle') || movementTargetFor(element) !== element) return;
    element.dataset.visualPositionKey = positionKey;
    applyPosition(element, position?.x || 0, position?.y || 0);
  });
}

export function VisualEditingBridge({localEditing = false}: {localEditing?: boolean}) {
  const location = useLocation();
  const {visualRecordForRoute, visualRecords} = useContent();
  const previewNonce = useMemo(() => new URLSearchParams(window.location.search).get('visualEditor'), []);
  const localMode = localEditing && window.parent === window;
  const nonce = previewNonce || (localMode ? LIVE_EDITOR_NONCE : null);
  const routeRecord = visualRecordForRoute(location.pathname);
  const settingsRecord = visualRecords['settings:business-details'];
  const editableKindsRef = useRef<Set<string>>(new Set());
  const editingEnabledRef = useRef(false);
  const selectedRef = useRef<VisualElement | null>(null);
  const suppressCommitRef = useRef(false);
  const suppressTimerRef = useRef<number>(0);
  const recordsReceivedRef = useRef(false);
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const prepare = () => {
      if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) return;
      if (nonce && !recordsReceivedRef.current) return;
      prepareAutomaticContent({nonce, routeRecord, settingsRecord, allRecords: visualRecords});
    };
    const schedule = () => {if (!frame) frame = window.requestAnimationFrame(() => {frame = 0; prepare();});};
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'href']});
    prepare();
    return () => {observer.disconnect(); if (frame) window.cancelAnimationFrame(frame);};
  }, [nonce, routeRecord, settingsRecord, visualRecords]);

  useEffect(() => {
    if (!nonce || (!localMode && window.parent === window)) return;

    document.documentElement.classList.add('nk-visual-preview');
    const post = (message: VisualMessage) => localMode
      ? window.dispatchEvent(new CustomEvent(LIVE_EDITOR_MESSAGE_EVENT, {detail: {...message, nonce}}))
      : window.parent.postMessage({...message, nonce}, window.location.origin);
    const keepEditingOn = (url: URL) => {
      if (localMode) url.searchParams.set('liveEdit', '1');
      else url.searchParams.set('visualEditor', nonce);
    };
    const moveHandle = document.createElement('button');
    moveHandle.type = 'button';
    moveHandle.className = 'nk-visual-free-move-handle';
    moveHandle.dataset.visualNoEdit = 'true';
    moveHandle.setAttribute('aria-label', 'Move selected element. Drag with soft alignment guides, or use the arrow keys.');
    moveHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
    moveHandle.title = 'Move element · guides snap softly · keep dragging to pass · Alt bypasses · Shift moves 10 px';
    moveHandle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3"/></svg>';
    document.body.appendChild(moveHandle);
    const verticalSnapGuide = document.createElement('div');
    verticalSnapGuide.className = 'nk-visual-snap-guide is-vertical';
    verticalSnapGuide.dataset.visualNoEdit = 'true';
    verticalSnapGuide.hidden = true;
    const horizontalSnapGuide = document.createElement('div');
    horizontalSnapGuide.className = 'nk-visual-snap-guide is-horizontal';
    horizontalSnapGuide.dataset.visualNoEdit = 'true';
    horizontalSnapGuide.hidden = true;
    document.body.append(verticalSnapGuide, horizontalSnapGuide);
    const contextToolbar = document.createElement('div');
    contextToolbar.className = 'nk-visual-context-toolbar';
    contextToolbar.dataset.visualNoEdit = 'true';
    contextToolbar.setAttribute('role', 'toolbar');
    contextToolbar.setAttribute('aria-label', 'Selected element actions');
    contextToolbar.hidden = true;
    contextToolbar.innerHTML = `
      <button type="button" data-action="undo" title="Undo the last change to this object"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v1"/></svg><span>Undo</span></button>
      <button type="button" data-action="redo" title="Redo the next change to this object"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v1"/></svg><span>Redo</span></button>
      <button type="button" data-action="history" title="Show this object's history"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg><span>History</span></button>
      <button type="button" data-action="properties" title="Edit this element"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span>Edit</span></button>
      <button type="button" data-action="add" title="Add a section or element"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Add</span></button>
      <button type="button" data-action="move" title="Drag to move this element"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3"/></svg><span>Move</span></button>
      <button type="button" data-action="duplicate" title="Duplicate this element"><svg viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copy</span></button>
      <button type="button" data-action="delete" class="danger" title="Delete this element"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg><span>Delete</span></button>
      <button type="button" data-action="navigate" title="Open this link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg><span>Open</span></button>`;
    document.body.appendChild(contextToolbar);

    const selectedLink = (element: VisualElement | null) => element
      ? element.closest<HTMLAnchorElement>('a[href]') || element.querySelector<HTMLAnchorElement>('a[href]')
      : null;

    const hideSnapGuides = () => {verticalSnapGuide.hidden = true; horizontalSnapGuide.hidden = true;};
    const collectNeighborRects = (source: VisualElement) => {
      const sourceRect = source.getBoundingClientRect();
      const sourceCenterX = sourceRect.left + sourceRect.width / 2;
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const sourceSection = source.dataset.visualSectionId || '';
      const seen = new Set<Element>();
      const candidates = [...document.querySelectorAll<VisualElement>('[data-visual-draggable="true"]')].flatMap(element => {
        const candidate = movementTargetFor(element);
        if (!candidate || candidate === source || seen.has(candidate) || source.contains(candidate) || candidate.contains(source)) return [];
        if (candidate.dataset.visualKind !== source.dataset.visualKind || candidate.dataset.visualSlug !== source.dataset.visualSlug) return [];
        const rect = candidate.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom < -80 || rect.top > window.innerHeight + 80 || rect.right < -80 || rect.left > window.innerWidth + 80) return [];
        seen.add(candidate);
        const sameContainer = candidate.parentElement === source.parentElement || Boolean(sourceSection && candidate.dataset.visualSectionId === sourceSection);
        const distance = Math.hypot(rect.left + rect.width / 2 - sourceCenterX, rect.top + rect.height / 2 - sourceCenterY);
        return [{rect, sameContainer, distance}];
      });
      const sameContainer = candidates.filter(candidate => candidate.sameContainer);
      return (sameContainer.length ? sameContainer : candidates.filter(candidate => candidate.distance <= 720))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 48)
        .map(candidate => candidate.rect);
    };
    const startPointerDrag = (source: VisualElement, event: PointerEvent) => {
      const position = positionOf(source);
      pointerDragRef.current = {source, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, startRect: source.getBoundingClientRect(), neighbors: collectNeighborRects(source), active: false};
    };
    const softSnap = (state: PointerDragState, rawX: number, rawY: number, bypass: boolean) => {
      const threshold = 7;
      const projected = {left: state.startRect.left + rawX - state.originX, right: state.startRect.right + rawX - state.originX, top: state.startRect.top + rawY - state.originY, bottom: state.startRect.bottom + rawY - state.originY};
      const sourceX = [projected.left, (projected.left + projected.right) / 2, projected.right];
      const sourceY = [projected.top, (projected.top + projected.bottom) / 2, projected.bottom];
      let bestX: {distance: number; offset: number; line: number; rect: DOMRect} | null = null;
      let bestY: {distance: number; offset: number; line: number; rect: DOMRect} | null = null;
      if (!bypass) for (const rect of state.neighbors) {
        const targetX = [rect.left, rect.left + rect.width / 2, rect.right];
        const targetY = [rect.top, rect.top + rect.height / 2, rect.bottom];
        for (const source of sourceX) for (const target of targetX) {
          const offset = target - source; const distance = Math.abs(offset);
          if (distance <= threshold && (!bestX || distance < bestX.distance)) bestX = {distance, offset, line: target, rect};
        }
        for (const source of sourceY) for (const target of targetY) {
          const offset = target - source; const distance = Math.abs(offset);
          if (distance <= threshold && (!bestY || distance < bestY.distance)) bestY = {distance, offset, line: target, rect};
        }
      }
      const snappedX = rawX + (bestX?.offset || 0);
      const snappedY = rawY + (bestY?.offset || 0);
      const snappedRect = {left: projected.left + (bestX?.offset || 0), right: projected.right + (bestX?.offset || 0), top: projected.top + (bestY?.offset || 0), bottom: projected.bottom + (bestY?.offset || 0)};
      if (bestX) {
        verticalSnapGuide.hidden = false;
        verticalSnapGuide.style.left = `${Math.round(bestX.line)}px`;
        verticalSnapGuide.style.top = `${Math.round(Math.min(snappedRect.top, bestX.rect.top) - 12)}px`;
        verticalSnapGuide.style.height = `${Math.round(Math.max(snappedRect.bottom, bestX.rect.bottom) - Math.min(snappedRect.top, bestX.rect.top) + 24)}px`;
      } else verticalSnapGuide.hidden = true;
      if (bestY) {
        horizontalSnapGuide.hidden = false;
        horizontalSnapGuide.style.top = `${Math.round(bestY.line)}px`;
        horizontalSnapGuide.style.left = `${Math.round(Math.min(snappedRect.left, bestY.rect.left) - 12)}px`;
        horizontalSnapGuide.style.width = `${Math.round(Math.max(snappedRect.right, bestY.rect.right) - Math.min(snappedRect.left, bestY.rect.left) + 24)}px`;
      } else horizontalSnapGuide.hidden = true;
      return {x: snappedX, y: snappedY};
    };

    const updateMoveHandle = () => {
      const target = movementTargetFor(selectedRef.current);
      if (!target?.isConnected || !editableKindsRef.current.has(target.dataset.visualKind || '')) {
        moveHandle.hidden = true;
        contextToolbar.hidden = true;
        return;
      }
      const rect = target.getBoundingClientRect();
      if (!rect.width && !rect.height) {moveHandle.hidden = true; contextToolbar.hidden = true; return;}
      moveHandle.hidden = false;
      const handleSize = 40;
      const handleGap = 8;
      const viewportPadding = 6;
      const availableLeft = rect.left - viewportPadding;
      const availableRight = window.innerWidth - rect.right - viewportPadding;
      const left = availableLeft >= handleSize + handleGap
        ? rect.left - handleSize - handleGap
        : availableRight >= handleSize + handleGap
          ? rect.right + handleGap
          : Math.max(viewportPadding, Math.min(window.innerWidth - handleSize - viewportPadding, rect.left + 6));
      const top = Math.max(viewportPadding, Math.min(window.innerHeight - handleSize - viewportPadding, rect.top + (rect.height - handleSize) / 2));
      moveHandle.style.left = `${Math.round(left)}px`;
      moveHandle.style.top = `${Math.round(top)}px`;
      contextToolbar.hidden = false;
      const duplicateButton = contextToolbar.querySelector<HTMLButtonElement>('[data-action="duplicate"]');
      if (duplicateButton) duplicateButton.hidden = !['section', 'component'].includes(selectedRef.current?.dataset.visualObjectType || '');
      const navigateButton = contextToolbar.querySelector<HTMLButtonElement>('[data-action="navigate"]');
      if (navigateButton) navigateButton.hidden = !selectedLink(selectedRef.current);
      const toolbarWidth = contextToolbar.offsetWidth || 320;
      const toolbarHeight = contextToolbar.offsetHeight || 48;
      const toolbarLeft = Math.max(6, Math.min(window.innerWidth - toolbarWidth - 6, rect.left));
      const toolbarTop = rect.top >= toolbarHeight + 54 ? rect.top - toolbarHeight - 50 : Math.min(window.innerHeight - toolbarHeight - 6, rect.bottom + 8);
      contextToolbar.style.left = `${Math.round(toolbarLeft)}px`;
      contextToolbar.style.top = `${Math.round(Math.max(6, toolbarTop))}px`;
    };

    const select = (element: VisualElement) => {
      if (!editableKindsRef.current.has(element.dataset.visualKind || '')) return;
      const isNewSelection = selectedRef.current !== element;
      movementTargetFor(selectedRef.current)?.classList.remove('nk-visual-move-selected');
      selectedRef.current?.classList.remove('nk-visual-selected');
      selectedRef.current = element;
      element.classList.add('nk-visual-selected');
      const movementTarget = movementTargetFor(element);
      movementTarget?.classList.add('nk-visual-move-selected');
      const position = positionOf(movementTarget);
      const positionKey = movementTarget ? positionKeyFor(movementTarget) : '';
      const textStyle = element instanceof HTMLElement && element.dataset.visualEdit === 'text' ? getComputedStyle(element) : null;
      if (movementTarget && positionKey) movementTarget.dataset.visualPositionKey = positionKey;
      updateMoveHandle();
      if (element.dataset.visualEdit === 'text' && (isNewSelection || element.dataset.visualInitialValue === undefined)) {
        element.dataset.visualInitialValue = element instanceof HTMLElement ? element.innerText.replace(/\r/g, '') : element.textContent || '';
      }
      post({
        type: 'nk-visual-editor:change',
        selectOnly: true,
        kind: element.dataset.visualKind || '',
        slug: element.dataset.visualSlug || '',
        path: element.dataset.visualPath || '',
        edit: element.dataset.visualEdit || 'text',
        label: element.dataset.visualLabel || 'Element',
        linkPath: element.dataset.visualLinkPath || '',
        sectionId: element.dataset.visualSectionId || '',
        objectType: element.dataset.visualObjectType || '',
        objectId: element.dataset.visualObjectId || '',
        positionKey,
        positionX: position.x,
        positionY: position.y,
        fontFamily: textStyle?.fontFamily || '',
        fontSize: textStyle ? Math.round(Number.parseFloat(textStyle.fontSize) || 16) : 0,
        textAlign: textStyle?.textAlign || '',
        fallbackValue: element.dataset.visualEdit === 'image' ? element.dataset.visualFallbackValue || element.getAttribute('src') || '' : element.dataset.visualEdit === 'icon' ? inferIconName(element) : element instanceof HTMLElement ? element.innerText.replace(/\r/g, '') : element.textContent || '',
        linkFallbackValue: element.dataset.visualLinkPath ? element.closest('a[href]')?.getAttribute('href') || '' : '',
      });
    };

    const prepareEditableElements = () => {
      document.documentElement.classList.toggle('nk-visual-edit-enabled', editingEnabledRef.current);
      document.querySelectorAll<VisualElement>('[data-visual-kind][data-visual-path]').forEach(element => {
        const editable = editableKindsRef.current.has(element.dataset.visualKind || '');
        if (editable && element.dataset.visualEdit !== 'text') {
          element.setAttribute('tabindex', '0');
          if (!element.matches('input, textarea, select, video, audio')) element.setAttribute('role', 'button');
          element.setAttribute('aria-label', `Edit ${element.dataset.visualLabel || 'element'}`);
        }
      });
      document.querySelectorAll<VisualElement>('[data-visual-draggable="true"]').forEach(element => {
        const editable = editableKindsRef.current.has(element.dataset.visualKind || '');
        if (element instanceof HTMLElement) element.draggable = false;
        element.setAttribute('draggable', 'false');
        if (editable) element.setAttribute('aria-roledescription', 'movable website object');
      });
      document.querySelectorAll<HTMLElement>('[data-visual-edit="text"][data-visual-kind]').forEach(element => {
        const editable = editableKindsRef.current.has(element.dataset.visualKind || '');
        const interactiveControl = element.closest('a[href], button');
        element.dataset.visualInteractiveText = interactiveControl ? 'true' : 'false';
        element.contentEditable = editable && !interactiveControl ? 'true' : 'false';
        if (editable) {
          element.spellcheck = true;
          if (!interactiveControl) {
            element.setAttribute('role', 'textbox');
            element.setAttribute('aria-label', `Edit ${element.dataset.visualLabel || 'text'}`);
          }
        } else {
          element.removeAttribute('role');
          element.removeAttribute('aria-label');
        }
      });
    };

    const runContextAction = (action: string) => {
      if (['add', 'duplicate', 'delete', 'undo', 'redo', 'history'].includes(action)) {
        post({type: 'nk-visual-editor:context-action', action});
        return;
      }
      const selected = selectedRef.current;
      if (action === 'properties') {
        if (selected && editableKindsRef.current.has(selected.dataset.visualKind || '') && selected.dataset.visualEdit === 'text' && selected instanceof HTMLElement) {
          selected.contentEditable = 'true';
          selected.focus({preventScroll: true});
        } else post({type: 'nk-visual-editor:context-action', action: 'properties'});
        return;
      }
      if (!selected || !editableKindsRef.current.has(selected.dataset.visualKind || '')) return;
      if (action === 'navigate') {
        const anchor = selectedLink(selected);
        if (!anchor) return;
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) {
          keepEditingOn(url);
          window.location.assign(url.href);
        }
        else window.open(url.href, '_blank', 'noopener,noreferrer');
        return;
      }
    };
    const onContextToolbarClick = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action]') : null;
      if (!button || !contextToolbar.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.action || '';
      if (action !== 'move' && event.detail === 0) runContextAction(action);
    };
    contextToolbar.addEventListener('click', onContextToolbarClick);

    let guideHighlightTimer = 0;
    let guideHighlightFrame = 0;
    const applyEditorMessage = (data: Record<string, unknown>) => {
      if (data.type === 'nk-visual-editor:guide-highlight' && data.nonce === nonce && typeof data.objectId === 'string') {
        if (guideHighlightFrame) window.cancelAnimationFrame(guideHighlightFrame);
        let attempts = 0;
        const reveal = () => {
          const target = [...document.querySelectorAll<VisualElement>('[data-visual-object-id]')].find(element => element.dataset.visualObjectId === data.objectId && element.dataset.visualObjectType === data.objectType && !element.classList.contains('cms-builder-drag-handle'));
          if (!target && attempts < 60) {attempts += 1; guideHighlightFrame = window.requestAnimationFrame(reveal); return;}
          guideHighlightFrame = 0;
          if (!target) return;
          select(target);
          target.scrollIntoView({behavior: 'smooth', block: window.innerWidth <= 520 ? 'start' : 'center', inline: 'center'});
          target.classList.remove('nk-visual-guide-highlight');
          void target.getBoundingClientRect();
          target.classList.add('nk-visual-guide-highlight');
          if (guideHighlightTimer) window.clearTimeout(guideHighlightTimer);
          guideHighlightTimer = window.setTimeout(() => target.classList.remove('nk-visual-guide-highlight'), 3200);
        };
        reveal();
        return;
      }
      if (data.type === 'nk-visual-editor:history-sync' && data.nonce === nonce) {
        if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
        suppressCommitRef.current = true;
        blurVisualElement(selectedRef.current);
        if (selectedRef.current instanceof HTMLElement && selectedRef.current.dataset.visualEdit === 'text' && typeof data.value === 'string') selectedRef.current.innerText = data.value;
        suppressTimerRef.current = window.setTimeout(() => {suppressCommitRef.current = false; suppressTimerRef.current = 0;}, 1200);
        return;
      }
      if (data.type === 'nk-visual-editor:focus-move' && data.nonce === nonce) {
        if (!moveHandle.hidden) moveHandle.focus({preventScroll: true});
        return;
      }
      if (data.type !== 'nk-visual-editor:records' || data.nonce !== nonce) return;
      removeAutomaticTextWrappers();
      editingEnabledRef.current = data.editingEnabled !== false;
      editableKindsRef.current = editingEnabledRef.current ? new Set(Array.isArray(data.editableKinds) ? data.editableKinds.filter((kind: unknown): kind is string => typeof kind === 'string') : []) : new Set();
      if (!editingEnabledRef.current) {
        blurVisualElement(selectedRef.current);
        movementTargetFor(selectedRef.current)?.classList.remove('nk-visual-move-selected');
        selectedRef.current?.classList.remove('nk-visual-selected');
        selectedRef.current = null;
        moveHandle.hidden = true;
        contextToolbar.hidden = true;
        hideSnapGuides();
      }
      recordsReceivedRef.current = true;
      prepareEditableElements();
      window.requestAnimationFrame(() => {
        if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = 0;
        suppressCommitRef.current = false;
        updateMoveHandle();
      });
    };
    const onMessage = (event: MessageEvent) => {
      if (localMode || event.origin !== window.location.origin || event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
      applyEditorMessage(event.data as Record<string, unknown>);
    };
    const onLocalCommand = (event: Event) => {
      if (!localMode || !(event instanceof CustomEvent) || !event.detail || typeof event.detail !== 'object') return;
      applyEditorMessage(event.detail as Record<string, unknown>);
    };

    const onPointerDown = (event: PointerEvent) => {
      const contextButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.nk-visual-context-toolbar button') : null;
      if (contextButton) {
        const action = contextButton.dataset.action || '';
        if (action === 'move') {
          event.preventDefault();
          event.stopPropagation();
          const source = movementTargetFor(selectedRef.current);
          if (!source || !editableKindsRef.current.has(source.dataset.visualKind || '')) return;
          startPointerDrag(source, event);
          contextButton.focus({preventScroll: true});
        } else runContextAction(action);
        return;
      }
      if (event.target instanceof Element && event.target.closest('.nk-visual-free-move-handle')) {
        const source = movementTargetFor(selectedRef.current);
        if (!source || !editableKindsRef.current.has(source.dataset.visualKind || '')) return;
        event.preventDefault();
        event.stopPropagation();
        startPointerDrag(source, event);
        moveHandle.focus({preventScroll: true});
        return;
      }
      const navigationAnchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      const navigationRequested = navigationAnchor && event.button === 0 && (!editingEnabledRef.current || event.ctrlKey || event.metaKey || event.shiftKey);
      if (navigationAnchor && navigationRequested && !navigationAnchor.hasAttribute('download')) {
        const url = new URL(navigationAnchor.href, window.location.href);
        event.preventDefault();
        event.stopPropagation();
        if (url.origin === window.location.origin) {
          keepEditingOn(url);
          window.location.assign(url.href);
        }
        else window.open(url.href, '_blank', 'noopener,noreferrer');
        return;
      }
      const element = readVisualTarget(event.target);
      if (element) select(element);
    };

    const onFocusIn = (event: FocusEvent) => {
      const element = readVisualTarget(event.target);
      if (element) select(element);
    };

    const onClick = (event: MouseEvent) => {
      if (justDraggedRef.current) {event.preventDefault(); event.stopPropagation(); justDraggedRef.current = false; return;}
      if (event.target instanceof Element && event.target.closest('.nk-visual-context-toolbar')) return;
      const element = readVisualTarget(event.target);
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (element && editableKindsRef.current.has(element.dataset.visualKind || '')) {
        select(element);
        if (anchor && (event.ctrlKey || event.metaKey || event.shiftKey)) {
          const url = new URL(anchor.href, window.location.href);
          if (url.origin === window.location.origin && !anchor.hasAttribute('download')) {
            event.preventDefault();
            event.stopPropagation();
            keepEditingOn(url);
            window.location.assign(url.href);
          }
          return;
        }
        event.stopPropagation();
        if (element.dataset.visualEdit !== 'text' || anchor || button) event.preventDefault();
        if (element.dataset.visualEdit === 'text') {
          if (element instanceof HTMLElement) {
            if (element.dataset.visualInteractiveText === 'true') element.contentEditable = 'true';
            element.focus({preventScroll: true});
          }
        }
        return;
      }
      if (anchor) {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) {
          event.preventDefault();
          event.stopPropagation();
          keepEditingOn(url);
          window.location.assign(url.href);
        } else {
          event.preventDefault();
          window.open(url.href, '_blank', 'noopener,noreferrer');
        }
      }
    };

    const onInput = (event: Event) => {
      const element = readVisualTarget(event.target);
      if (!(element instanceof HTMLElement) || element.dataset.visualEdit !== 'text' || !editableKindsRef.current.has(element.dataset.visualKind || '')) return;
      if (element.dataset.visualAutoWrapper === 'true') return;
      post({type: 'nk-visual-editor:change', kind: element.dataset.visualKind || '', slug: element.dataset.visualSlug || '', path: element.dataset.visualPath || '', edit: 'text', label: element.dataset.visualLabel || 'Text', linkPath: element.dataset.visualLinkPath || '', sectionId: element.dataset.visualSectionId || '', objectType: element.dataset.visualObjectType || '', objectId: element.dataset.visualObjectId || '', fallbackValue: element.dataset.visualInitialValue ?? element.dataset.visualBaseText ?? element.innerText.replace(/\r/g, ''), linkFallbackValue: element.dataset.visualLinkPath ? element.closest('a[href]')?.getAttribute('href') || '' : '', value: element.innerText.replace(/\r/g, ''), commit: false});
    };

    const onFocusOut = (event: FocusEvent) => {
      const element = readVisualTarget(event.target);
      if (!(element instanceof HTMLElement) || element.dataset.visualEdit !== 'text' || !editableKindsRef.current.has(element.dataset.visualKind || '')) return;
      if (suppressCommitRef.current) return;
      const value = element.innerText.replace(/\r/g, '');
      const initialValue = element.dataset.visualInitialValue;
      delete element.dataset.visualInitialValue;
      const finishInteractiveEdit = () => {
        if (element.dataset.visualInteractiveText === 'true') element.contentEditable = 'false';
      };
      if (initialValue === value) {
        finishInteractiveEdit();
        if (element.dataset.visualAutoWrapper === 'true') {
          element.replaceWith(document.createTextNode(value));
          selectedRef.current = null;
        }
        return;
      }
      const message = {type: 'nk-visual-editor:change', kind: element.dataset.visualKind || '', slug: element.dataset.visualSlug || '', path: element.dataset.visualPath || '', edit: 'text', label: element.dataset.visualLabel || 'Text', linkPath: element.dataset.visualLinkPath || '', sectionId: element.dataset.visualSectionId || '', objectType: element.dataset.visualObjectType || '', objectId: element.dataset.visualObjectId || '', fallbackValue: initialValue ?? element.dataset.visualBaseText ?? value, linkFallbackValue: element.dataset.visualLinkPath ? element.closest('a[href]')?.getAttribute('href') || '' : '', value, commit: true};
      if (element.dataset.visualAutoWrapper === 'true') {
        element.replaceWith(document.createTextNode(value));
        selectedRef.current = null;
      }
      post(message);
      finishInteractiveEdit();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
        event.preventDefault();
        const selected = selectedRef.current;
        const objectId = selected?.dataset.visualObjectId || '';
        const objectType = selected?.dataset.visualObjectType || '';
        if (selected?.dataset.visualAutoWrapper === 'true') blurVisualElement(selected);
        post({type: 'nk-visual-editor:history-shortcut', direction: event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo', objectOnly: Boolean(objectId), objectId, objectType});
        return;
      }
      const movementKeys: Record<string, [number, number]> = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
      const movement = movementKeys[event.key];
      const movementTarget = movementTargetFor(selectedRef.current);
      const target = event.target;
      const isMoveHandle = target instanceof Element && Boolean(target.closest('.nk-visual-free-move-handle, .nk-visual-context-toolbar [data-action="move"]'));
      const isEditingControl = target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select'));
      if (movement && movementTarget && !event.altKey && !event.ctrlKey && !event.metaKey && (isMoveHandle || !isEditingControl)) {
        event.preventDefault();
        event.stopPropagation();
        const position = positionOf(movementTarget);
        const distance = event.shiftKey ? 10 : 1;
        applyPosition(movementTarget, position.x + movement[0] * distance, position.y + movement[1] * distance);
        updateMoveHandle();
        const next = positionOf(movementTarget);
        post({type: 'nk-visual-editor:position', kind: movementTarget.dataset.visualKind || '', slug: movementTarget.dataset.visualSlug || '', positionKey: movementTarget.dataset.visualPositionKey || positionKeyFor(movementTarget), x: next.x, y: next.y, label: selectedRef.current?.dataset.visualLabel || movementTarget.dataset.visualLabel || 'Element', objectType: movementTarget.dataset.visualObjectType || '', objectId: movementTarget.dataset.visualObjectId || '', sectionId: movementTarget.dataset.visualSectionId || ''});
        return;
      }
      const element = readVisualTarget(event.target);
      if (!element || element.dataset.visualEdit !== 'text') return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (event.key === 'Enter' && anchor && !event.shiftKey && !(element instanceof HTMLElement && element.isContentEditable)) {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && !anchor.hasAttribute('download')) {
          event.preventDefault();
          keepEditingOn(url);
          window.location.assign(url.href);
        }
        return;
      }
      if (event.key === 'Enter' && button && !(element instanceof HTMLElement && element.isContentEditable)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        element.blur();
      } else if (event.key === 'Enter' && element.dataset.visualMultiline !== 'true' && element instanceof HTMLElement && element.isContentEditable) {
        event.preventDefault();
        element.blur();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state) return;
      if (!state.active && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 3) return;
      if (!state.active) {state.active = true; state.source.classList.add('nk-visual-positioning'); moveHandle.classList.add('is-dragging');}
      event.preventDefault();
      const snapped = softSnap(state, state.originX + event.clientX - state.startX, state.originY + event.clientY - state.startY, event.altKey);
      applyPosition(state.source, snapped.x, snapped.y);
      updateMoveHandle();
    };
    const onPointerUp = (event: PointerEvent) => {
      const state = pointerDragRef.current;
      pointerDragRef.current = null;
      hideSnapGuides();
      if (!state?.active) return;
      event.preventDefault();
      state.source.classList.remove('nk-visual-positioning');
      moveHandle.classList.remove('is-dragging');
      const position = positionOf(state.source);
      post({type: 'nk-visual-editor:position', kind: state.source.dataset.visualKind || '', slug: state.source.dataset.visualSlug || '', positionKey: state.source.dataset.visualPositionKey || positionKeyFor(state.source), x: position.x, y: position.y, label: selectedRef.current?.dataset.visualLabel || state.source.dataset.visualLabel || 'Element', objectType: state.source.dataset.visualObjectType || '', objectId: state.source.dataset.visualObjectId || '', sectionId: state.source.dataset.visualSectionId || ''});
      justDraggedRef.current = true;
    };

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      post({type: 'nk-visual-editor:blocked-action', action: 'form-submit'});
    };

    let prepareFrame = 0;
    const schedulePreparation = () => {
      if (prepareFrame) return;
      prepareFrame = window.requestAnimationFrame(() => {prepareFrame = 0; prepareEditableElements();});
    };
    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => [...mutation.addedNodes].some(node => node instanceof Element && (node.matches('[data-visual-kind], [data-visual-draggable], [data-visual-dropzone]') || node.querySelector('[data-visual-kind], [data-visual-draggable], [data-visual-dropzone]'))))) schedulePreparation();
      window.requestAnimationFrame(updateMoveHandle);
    });
    observer.observe(document.body, {childList: true, subtree: true});
    window.addEventListener('message', onMessage);
    window.addEventListener(LIVE_EDITOR_COMMAND_EVENT, onLocalCommand);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('pointermove', onPointerMove, {capture: true, passive: false});
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('scroll', updateMoveHandle, true);
    window.addEventListener('resize', updateMoveHandle);
    document.addEventListener('submit', onSubmit, true);
    const readyTimer = window.setTimeout(() => post({type: 'nk-visual-editor:ready', path: `${location.pathname}${location.search}`}), 0);
    prepareEditableElements();

    return () => {
      observer.disconnect();
      if (prepareFrame) window.cancelAnimationFrame(prepareFrame);
      if (guideHighlightFrame) window.cancelAnimationFrame(guideHighlightFrame);
      if (guideHighlightTimer) window.clearTimeout(guideHighlightTimer);
      if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
      window.clearTimeout(readyTimer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener(LIVE_EDITOR_COMMAND_EVENT, onLocalCommand);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('scroll', updateMoveHandle, true);
      window.removeEventListener('resize', updateMoveHandle);
      document.removeEventListener('submit', onSubmit, true);
      selectedRef.current?.classList.remove('nk-visual-selected');
      movementTargetFor(selectedRef.current)?.classList.remove('nk-visual-move-selected');
      moveHandle.remove();
      verticalSnapGuide.remove();
      horizontalSnapGuide.remove();
      contextToolbar.removeEventListener('click', onContextToolbarClick);
      contextToolbar.remove();
      document.documentElement.classList.remove('nk-visual-preview');
      document.documentElement.classList.remove('nk-visual-edit-enabled');
    };
  }, [localMode, location.pathname, location.search, nonce]);

  return null;
}
