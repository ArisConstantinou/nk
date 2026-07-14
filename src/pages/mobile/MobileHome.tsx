import {ArrowUpRight, CircuitBoard, Lightbulb, PlugZap, Refrigerator} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../../context/ContentContext';
import {publicAsset} from '../../utils/assets';

export default function MobileHome() {
  const {content} = useContent();
  return <>
    <section className="mobile-hero">
      <div className="mobile-hero-image"><img src={content.heroImage} alt="Architectural lighting in a contemporary Cyprus interior"/><div className="mobile-orbit"/><span>Since ’85</span></div>
      <div className="mobile-hero-copy"><span className="eyebrow">{content.eyebrow}</span><h1>{content.heroTitle}<br/><em>{content.heroAccent}</em></h1><p>{content.heroBody}</p><Link className="button copper" to="/electrical-installations">Electrical installations <ArrowUpRight/></Link></div>
    </section>
    <section className="mobile-manifesto"><small>Electrical work since 1985</small><h2>Planned clearly.<br/><em>Installed properly.</em></h2><p>Dedicated electrical installation, lighting, appliance and smart-system expertise.</p></section>
    <section className="mobile-disciplines">
      <Link to="/electrical-installations"><PlugZap/><h3>Electrical installations</h3><ArrowUpRight/></Link>
      <Link to="/lighting"><Lightbulb/><h3>Lighting</h3><ArrowUpRight/></Link>
      <Link to="/appliances"><Refrigerator/><h3>Appliances</h3><ArrowUpRight/></Link>
      <Link to="/electrical-installations#smart"><CircuitBoard/><h3>Smart systems</h3><ArrowUpRight/></Link>
    </section>
    <section className="mobile-season"><span className="eyebrow light">Filter the collection</span><h2>Products by room,<br/><em>season and purpose.</em></h2><div className="mobile-season-scroll">
      <Link to="/explore?season=Summer" style={{backgroundImage:`url(${publicAsset('assets/generated/season-summer.webp')})`}}><b>Summer</b><span>Outdoor lighting · fans · cooling</span></Link>
      <Link to="/explore?season=Christmas" style={{backgroundImage:`url(${publicAsset('assets/generated/season-christmas.webp')})`}}><b>Christmas</b><span>Dining lights · coffee · food preparation</span></Link>
      <Link to="/explore?season=Winter" style={{backgroundImage:`url(${publicAsset('assets/generated/season-winter.webp')})`}}><b>Winter</b><span>Interior lighting · coffee · air comfort</span></Link>
    </div><Link className="button cream" to="/explore">Explore products <ArrowUpRight/></Link></section>
    <section className="mobile-proof"><div><b>40</b><span>Years</span></div><div><b>50+</b><span>Projects / year</span></div><div><b>4</b><span>Specialist services</span></div></section>
  </>;
}
