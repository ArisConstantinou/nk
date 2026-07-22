import {useEffect, useRef, useState} from 'react';
import {BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircuitBoard, Lightbulb, ShieldCheck, Sparkles, Sun, Zap} from 'lucide-react';
import {HeaderCampaignPicker, HeaderCampaignShowcase, HEADER_CAMPAIGNS, type HeaderCampaignId} from './HeaderCampaignShowcase';
import '../pages/header-studio.css';

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
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const activeCampaign = HEADER_CAMPAIGNS.find(item => item.id === campaignId) || HEADER_CAMPAIGNS[0];
  const UtilityIcon = utilityIcons[activeCampaign.id];

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaignId); }, [campaignId]);
  useEffect(() => { window.localStorage.setItem('nk-mobile-header-story-open', String(mobileStoryOpen)); }, [mobileStoryOpen]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.matchMedia('(max-width: 900px)').matches) {
        setCampaignId(current => adjacentCampaign(current, 1));
      }
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [campaignId]);
  useEffect(() => {
    const switcher = mobileSwitcherRef.current;
    if (!mobileStoryOpen || !switcher || !window.matchMedia('(max-width: 900px)').matches) {
      setShowFloatingClose(false);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setShowFloatingClose(!entry.isIntersecting);
    }, {rootMargin: '-74px 0px 0px 0px'});
    observer.observe(switcher);
    return () => observer.disconnect();
  }, [mobileStoryOpen]);

  const moveCampaign = (direction: -1 | 1) => setCampaignId(current => adjacentCampaign(current, direction));
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
    <div className="nk-main-header-preview__story" id="nk-mobile-header-story">
      <HeaderCampaignShowcase campaignId={campaignId}/>
      <HeaderCampaignPicker activeId={campaignId} onSelect={setCampaignId}/>
    </div>
    {mobileStoryOpen && showFloatingClose && <button
      className="nk-main-header-preview__floating-close"
      type="button"
      aria-controls="nk-mobile-header-story"
      aria-label={`Close ${activeCampaign.name} highlight`}
      onClick={closeMobileStory}
    >Close highlight<ChevronDown aria-hidden="true"/></button>}
  </section>;
}
