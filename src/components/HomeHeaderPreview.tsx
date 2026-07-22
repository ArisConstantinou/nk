import {useEffect, useRef, useState} from 'react';
import {BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircuitBoard, Lightbulb, ShieldCheck, Sparkles, Sun, Zap} from 'lucide-react';
import {HeaderCampaignPicker, HeaderCampaignShowcase, HEADER_CAMPAIGNS, type HeaderCampaignId, useHeaderCampaigns} from './HeaderCampaignShowcase';
import {resolvePublicUrl} from '../utils/assets';
import '../pages/header-studio.css';
import '../pages/header-unified-panels.css';

const storedCampaign = () => {
  const stored = window.localStorage.getItem('nk-header-studio-concept');
  return HEADER_CAMPAIGNS.some(item => item.id === stored) ? stored as HeaderCampaignId : '01';
};

const storedMobileStoryVisibility = () => window.localStorage.getItem('nk-mobile-header-story-open') === 'true';

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

export function HomeHeaderPreview() {
  const [campaignId, setCampaignId] = useState<HeaderCampaignId>(storedCampaign);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(storedMobileStoryVisibility);
  const [showFloatingClose, setShowFloatingClose] = useState(false);
  const mobileSwitcherRef = useRef<HTMLDivElement>(null);
  const mobileStoryRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const campaigns = useHeaderCampaigns();
  const activeCampaign = HEADER_CAMPAIGNS.find(item => item.id === campaignId) || HEADER_CAMPAIGNS[0];
  const UtilityIcon = utilityIcons[activeCampaign.id];

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaignId); }, [campaignId]);
  useEffect(() => { window.localStorage.setItem('nk-mobile-header-story-open', String(mobileStoryOpen)); }, [mobileStoryOpen]);
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
    const switcher = mobileSwitcherRef.current;
    const story = mobileStoryRef.current;
    if (!mobileStoryOpen || !switcher || !story || !window.matchMedia('(max-width: 900px)').matches) {
      setShowFloatingClose(false);
      return;
    }

    let switcherVisible = true;
    let storyVisible = true;
    const updateVisibility = () => setShowFloatingClose(!switcherVisible && storyVisible);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === switcher) switcherVisible = entry.isIntersecting;
        if (entry.target === story) storyVisible = entry.isIntersecting;
      });
      updateVisibility();
    }, {rootMargin: '-74px 0px 0px 0px'});
    observer.observe(switcher);
    observer.observe(story);
    return () => observer.disconnect();
  }, [mobileStoryOpen]);

  const moveCampaign = (direction: -1 | 1) => setCampaignId(current => adjacentCampaign(current, direction));
  const selectCampaign = (nextCampaignId: HeaderCampaignId) => {
    setCampaignId(nextCampaignId);
    if (!mobileStoryOpen || !window.matchMedia('(max-width: 900px)').matches) return;
    window.requestAnimationFrame(() => {
      document.getElementById('nk-mobile-header-story')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    });
  };
  const closeMobileStory = () => {
    setMobileStoryOpen(false);
    window.requestAnimationFrame(() => mobileToggleRef.current?.focus({preventScroll: true}));
  };

  return <section className={`nk-main-header-preview ${mobileStoryOpen ? 'is-mobile-open' : 'is-mobile-collapsed'}`} aria-label="NK Electrical current highlights">
    <div className="nk-main-header-preview__mobile-switcher" ref={mobileSwitcherRef}>
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
          aria-controls="nk-mobile-header-story"
          aria-label={`${mobileStoryOpen ? 'Hide' : 'Explore'} ${activeCampaign.name} highlight`}
          onClick={() => setMobileStoryOpen(open => !open)}
        >
          <span>{mobileStoryOpen ? 'Hide' : 'Explore'}</span><ChevronDown aria-hidden="true"/>
        </button>
      </div>
    </div>
    <div className="nk-main-header-preview__story" id="nk-mobile-header-story" ref={mobileStoryRef}>
      <HeaderCampaignShowcase campaignId={campaignId}/>
      <HeaderCampaignPicker
        activeId={campaignId}
        onSelect={selectCampaign}
        prefix={<div className="nk-campaign-picker__steps" role="group" aria-label="Step through live stories">
          <button type="button" aria-label="Previous live story" onClick={() => moveCampaign(-1)}><ChevronLeft aria-hidden="true"/></button>
          <button type="button" aria-label="Next live story" onClick={() => moveCampaign(1)}><ChevronRight aria-hidden="true"/></button>
        </div>}
      />
      {mobileStoryOpen && showFloatingClose && <div className="nk-main-header-preview__close-rail">
        <button
          className="nk-main-header-preview__floating-close"
          type="button"
          aria-controls="nk-mobile-header-story"
          aria-label={`Hide ${activeCampaign.name} panel`}
          onClick={closeMobileStory}
        ><span><small>PANEL OPEN</small><strong>Hide panel</strong></span><ChevronDown aria-hidden="true"/></button>
      </div>}
    </div>
  </section>;
}
