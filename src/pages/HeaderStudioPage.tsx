import {ArrowLeft, ChevronLeft, ChevronRight} from 'lucide-react';
import {useEffect} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {HeaderCampaignPicker, HeaderCampaignShowcase, HEADER_CAMPAIGNS, type HeaderCampaignId} from '../components/HeaderCampaignShowcase';
import {ResponsiveImage} from '../components/ResponsiveImage';
import {publicAsset} from '../utils/assets';
import './header-studio.css';

const navItems = [
  {label: 'Services', detail: 'DESIGN · INSTALL · TEST', image: 'assets/generated/navigation-tabs/services-v2.webp'},
  {label: 'Shop', detail: 'LIGHTING · CONTROLS · SUPPLY', image: 'assets/generated/navigation-tabs/shop-v2.webp'},
  {label: 'Projects', detail: 'BUILT · TESTED · DELIVERED', image: 'assets/generated/navigation-tabs/projects.webp'},
  {label: 'About', detail: 'EXPERIENCE · STANDARDS · CRAFT', image: 'assets/generated/navigation-tabs/about-v2.webp'},
  {label: 'Contact', detail: 'ENQUIRE · PLAN · VISIT', image: 'assets/generated/navigation-tabs/contact.webp'},
] as const;

function LockedNavigation() {
  return <nav className="nk-studio-nav" aria-label="Existing navigation preview">{navItems.map(item => <a href="#studio-details" key={item.label}>
    <ResponsiveImage src={publicAsset(item.image)} alt=""/>
    <i aria-hidden="true"/>
    <span><small>{item.detail}</small><strong>{item.label}</strong></span>
  </a>)}</nav>;
}

export function HeaderStudioPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('concept') || window.localStorage.getItem('nk-header-studio-concept') || '01';
  const index = Math.max(0, HEADER_CAMPAIGNS.findIndex(item => item.id === requested));
  const campaign = HEADER_CAMPAIGNS[index];

  useEffect(() => { window.localStorage.setItem('nk-header-studio-concept', campaign.id); }, [campaign.id]);

  const select = (id: HeaderCampaignId) => setParams({concept: id});
  const move = (delta: number) => select(HEADER_CAMPAIGNS[(index + delta + HEADER_CAMPAIGNS.length) % HEADER_CAMPAIGNS.length].id);

  return <main className="nk-header-studio">
    <section className="nk-header-studio__live">
      <HeaderCampaignShowcase campaignId={campaign.id}/>
      <HeaderCampaignPicker activeId={campaign.id} onSelect={select} prefix={<Link className="nk-campaign-picker__back" to="/" aria-label="Back to site"><ArrowLeft/><span>Site</span></Link>}/>
      <LockedNavigation/>
    </section>

    <section className="nk-header-studio__decision" id="studio-details">
      <button type="button" onClick={() => move(-1)} aria-label="Previous campaign"><ChevronLeft/></button>
      <div><span>ATTENTION STORY {campaign.id}</span><h1>{campaign.name}</h1><p>Η ίδια σύνθεση εμφανίζεται live στην αρχική σελίδα. Τα bullets αλλάζουν πραγματικό περιεχόμενο, εικόνα, χρώμα και δομή — όχι απλώς background.</p></div>
      <button type="button" onClick={() => move(1)} aria-label="Next campaign"><ChevronRight/></button>
    </section>

    <nav className="nk-header-studio__cards" aria-label="All header stories">{HEADER_CAMPAIGNS.map(item => <button className={item.id === campaign.id ? 'active' : ''} type="button" onClick={() => select(item.id)} key={item.id}><b>{item.id}</b><span>{item.name}</span><small>{item.short}</small></button>)}</nav>
  </main>;
}
