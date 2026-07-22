import {useEffect, useState} from 'react';
import {BookOpen, Check, ChevronDown, CircuitBoard, Lightbulb, ShieldCheck, Sparkles, Sun, Zap} from 'lucide-react';
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

export function HomeHeaderPreview() {
  const [campaignId, setCampaignId] = useState<HeaderCampaignId>(storedCampaign);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(storedMobileStoryVisibility);
  const activeCampaign = HEADER_CAMPAIGNS.find(item => item.id === campaignId) || HEADER_CAMPAIGNS[0];
  const UtilityIcon = utilityIcons[activeCampaign.id];

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaignId); }, [campaignId]);
  useEffect(() => { window.localStorage.setItem('nk-mobile-header-story-open', String(mobileStoryOpen)); }, [mobileStoryOpen]);

  return <section className={`nk-main-header-preview ${mobileStoryOpen ? 'is-mobile-open' : 'is-mobile-collapsed'}`} aria-label="NK Electrical current highlights">
    <button
      className="nk-main-header-preview__mobile-toggle"
      type="button"
      aria-expanded={mobileStoryOpen}
      aria-controls="nk-mobile-header-story"
      onClick={() => setMobileStoryOpen(open => !open)}
    >
      <UtilityIcon aria-hidden="true"/>
      <span><small>{activeCampaign.utility}</small><strong>{activeCampaign.name}</strong></span>
      <b>{mobileStoryOpen ? 'Hide' : 'Explore'}<ChevronDown aria-hidden="true"/></b>
    </button>
    <div className="nk-main-header-preview__story" id="nk-mobile-header-story">
      <HeaderCampaignShowcase campaignId={campaignId}/>
      <HeaderCampaignPicker activeId={campaignId} onSelect={setCampaignId}/>
    </div>
  </section>;
}
