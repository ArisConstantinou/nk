import {useEffect, useState} from 'react';
import {HeaderCampaignPicker, HeaderCampaignShowcase, HEADER_CAMPAIGNS, type HeaderCampaignId} from './HeaderCampaignShowcase';
import '../pages/header-studio.css';

const storedCampaign = () => {
  const stored = window.localStorage.getItem('nk-header-studio-concept');
  return HEADER_CAMPAIGNS.some(item => item.id === stored) ? stored as HeaderCampaignId : '01';
};

export function HomeHeaderPreview() {
  const [campaignId, setCampaignId] = useState<HeaderCampaignId>(storedCampaign);

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaignId); }, [campaignId]);

  return <section className="nk-main-header-preview" aria-label="NK Electrical current highlights">
    <HeaderCampaignShowcase campaignId={campaignId}/>
    <HeaderCampaignPicker activeId={campaignId} onSelect={setCampaignId}/>
  </section>;
}
