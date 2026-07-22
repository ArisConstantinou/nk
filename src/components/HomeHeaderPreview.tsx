import {useEffect, useRef, useState, type RefObject} from 'react';
import {BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircuitBoard, Lightbulb, ShieldCheck, Sparkles, Sun, X, Zap} from 'lucide-react';
import {createPortal} from 'react-dom';
import {HeaderCampaignPicker, HeaderCampaignShowcase, HEADER_CAMPAIGNS, type HeaderCampaignId, useHeaderCampaigns} from './HeaderCampaignShowcase';
import {resolvePublicUrl} from '../utils/assets';
import '../pages/header-studio.css';
import '../pages/header-unified-panels.css';

const storedCampaign = () => {
  const stored = window.localStorage.getItem('nk-header-studio-concept');
  return HEADER_CAMPAIGNS.some(item => item.id === stored) ? stored as HeaderCampaignId : '01';
};

const utilityIcons = {
  '01': Zap,
  '02': Sun,
  '03': Sparkles,
  '04': ShieldCheck,
  '05': Sun,
  '06': Lightbulb,
  '07': Lightbulb,
  '08': BookOpen,
  '09': CircuitBoard,
  '10': Check,
} satisfies Record<HeaderCampaignId, typeof Sparkles>;

const adjacentCampaign = (campaignId: HeaderCampaignId, direction: -1 | 1) => {
  const currentIndex = HEADER_CAMPAIGNS.findIndex(item => item.id === campaignId);
  const nextIndex = (currentIndex + direction + HEADER_CAMPAIGNS.length) % HEADER_CAMPAIGNS.length;
  return HEADER_CAMPAIGNS[nextIndex].id;
};

type HomeHeaderPreviewProps = {
  desktopStoryOpen?: boolean;
  desktopTriggerRef?: RefObject<HTMLButtonElement | null>;
  isDesktopViewport?: boolean;
  onDesktopStoryClose?: () => void;
};

export function HomeHeaderPreview({
  desktopStoryOpen = false,
  desktopTriggerRef,
  isDesktopViewport = false,
  onDesktopStoryClose,
}: HomeHeaderPreviewProps) {
  const [campaignId, setCampaignId] = useState<HeaderCampaignId>(storedCampaign);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(false);
  const mobileStoryRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const campaigns = useHeaderCampaigns();
  const activeCampaign = HEADER_CAMPAIGNS.find(item => item.id === campaignId) || HEADER_CAMPAIGNS[0];
  const UtilityIcon = utilityIcons[activeCampaign.id];
  const modalOpen = isDesktopViewport ? desktopStoryOpen : mobileStoryOpen;

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaignId); }, [campaignId]);
  useEffect(() => {
    const currentIndex = campaigns.findIndex(campaign => campaign.id === campaignId);
    if (currentIndex < 0) return;
    const preloadIndexes = [currentIndex, (currentIndex + 1) % campaigns.length, (currentIndex - 1 + campaigns.length) % campaigns.length];
    const sources = [...new Set(preloadIndexes.flatMap(index => [
      campaigns[index].image,
      ...(campaigns[index].products || []).map(product => product.image),
    ]))];
    sources.forEach(source => {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = resolvePublicUrl(source);
    });
  }, [campaignId, campaigns]);
  useEffect(() => {
    let timer: number;
    const rotate = () => {
      if (document.activeElement?.closest('.nk-campaign-search')) {
        timer = window.setTimeout(rotate, 2_000);
        return;
      }
      if (window.matchMedia('(max-width: 900px)').matches) {
        setCampaignId(current => adjacentCampaign(current, 1));
      }
    };
    timer = window.setTimeout(rotate, 10_000);
    return () => window.clearTimeout(timer);
  }, [campaignId]);
  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = isDesktopViewport ? desktopTriggerRef?.current : mobileToggleRef.current;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeButtonRef.current?.focus({preventScroll: true}));

    const closeModal = () => {
      if (isDesktopViewport) onDesktopStoryClose?.();
      else setMobileStoryOpen(false);
      window.requestAnimationFrame(() => trigger?.focus({preventScroll: true}));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter(element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [desktopStoryOpen, desktopTriggerRef, isDesktopViewport, mobileStoryOpen, modalOpen, onDesktopStoryClose]);

  const moveCampaign = (direction: -1 | 1) => setCampaignId(current => adjacentCampaign(current, direction));
  const selectCampaign = (nextCampaignId: HeaderCampaignId) => {
    setCampaignId(nextCampaignId);
    if (!mobileStoryOpen || isDesktopViewport) return;
    window.requestAnimationFrame(() => {
      mobileStoryRef.current?.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
  };
  const closeStory = () => {
    const trigger = isDesktopViewport ? desktopTriggerRef?.current : mobileToggleRef.current;
    if (isDesktopViewport) onDesktopStoryClose?.();
    else setMobileStoryOpen(false);
    window.requestAnimationFrame(() => trigger?.focus({preventScroll: true}));
  };

  const modal = modalOpen && createPortal(<div className={`nk-main-header-preview nk-highlights-modal ${isDesktopViewport ? 'is-desktop-modal' : 'is-mobile-modal'} ${mobileStoryOpen ? 'is-mobile-open' : ''}`}>
    <button className="nk-highlights-modal__backdrop" type="button" tabIndex={-1} aria-label="Close highlights" onClick={closeStory}/>
    <div className="nk-highlights-modal__dialog" id="nk-highlights-dialog" role="dialog" aria-modal="true" aria-labelledby="nk-highlights-title" ref={dialogRef}>
      <header className="nk-highlights-modal__header">
        <span className="nk-highlights-modal__title"><small>NK ELECTRICAL</small><strong id="nk-highlights-title">Highlights</strong></span>
        <span className="nk-highlights-modal__active" aria-live="polite"><small>{activeCampaign.utility}</small><strong>{activeCampaign.name}</strong></span>
        <button className="nk-highlights-modal__close" ref={closeButtonRef} type="button" aria-label="Close highlights" onClick={closeStory}><span>Close</span><X aria-hidden="true"/></button>
      </header>
      <div className="nk-main-header-preview__story" ref={mobileStoryRef}>
        <HeaderCampaignPicker
          activeId={campaignId}
          onSelect={selectCampaign}
          prefix={<div className="nk-campaign-picker__steps" role="group" aria-label="Step through highlights">
            <button type="button" aria-label="Previous highlight" onClick={() => moveCampaign(-1)}><ChevronLeft aria-hidden="true"/></button>
            <button type="button" aria-label="Next highlight" onClick={() => moveCampaign(1)}><ChevronRight aria-hidden="true"/></button>
          </div>}
        />
        <HeaderCampaignShowcase campaignId={campaignId}/>
      </div>
    </div>
  </div>, document.body);

  return <>
    <section className={`nk-main-header-preview nk-main-header-preview--launcher ${desktopStoryOpen ? 'is-desktop-open' : 'is-desktop-collapsed'} ${mobileStoryOpen ? 'is-mobile-open' : 'is-mobile-collapsed'}`} aria-label="NK Electrical current highlights">
    <div className="nk-main-header-preview__mobile-switcher">
      <div className="nk-main-header-preview__mobile-summary">
        <button className="nk-main-header-preview__mobile-step is-previous" type="button" aria-label="Previous highlight" onClick={() => moveCampaign(-1)}><ChevronLeft aria-hidden="true"/></button>
        <UtilityIcon aria-hidden="true"/>
        <span aria-live="polite"><small>{activeCampaign.utility}</small><strong>{activeCampaign.name}</strong></span>
        <button className="nk-main-header-preview__mobile-step is-next" type="button" aria-label="Next highlight" onClick={() => moveCampaign(1)}><ChevronRight aria-hidden="true"/></button>
      </div>
      <div className="nk-main-header-preview__mobile-controls">
        <button
          className="nk-main-header-preview__mobile-toggle"
          ref={mobileToggleRef}
          type="button"
          aria-expanded={mobileStoryOpen}
          aria-controls="nk-highlights-dialog"
          aria-haspopup="dialog"
          aria-label={`Open ${activeCampaign.name} highlight`}
          onClick={() => setMobileStoryOpen(open => !open)}
        >
          <span>Highlights</span><ChevronDown aria-hidden="true"/>
        </button>
      </div>
    </div>
    </section>
    {modal}
  </>;
}
