import {motion} from 'framer-motion';
import {ArrowDown, ArrowUpRight, CircuitBoard, Lightbulb, PlugZap, Refrigerator, Sparkles} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../../context/ContentContext';
import {RemotionHero} from '../../components/RemotionHero';
import {publicAsset} from '../../utils/assets';

const ease = [0.22, 1, 0.36, 1] as const;

export default function DesktopHome() {
  const {content} = useContent();
  return <>
    <section className="hero desktop-hero">
      <div className="hero-copy">
        <motion.span initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{duration:.7, ease}} className="eyebrow light">{content.eyebrow}</motion.span>
        <motion.h1 initial={{opacity:0, y:35}} animate={{opacity:1, y:0}} transition={{duration:.9, delay:.08, ease}}>{content.heroTitle}<br/><em>{content.heroAccent}</em></motion.h1>
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.45}}>{content.heroBody}</motion.p>
        <motion.div initial={{opacity:0, y:16}} animate={{opacity:1, y:0}} transition={{delay:.55}} className="hero-actions">
          <Link className="button copper" to="/electrical-installations">Electrical installations <ArrowUpRight/></Link>
          <Link className="text-link light" to="/projects">See selected work <ArrowUpRight/></Link>
        </motion.div>
      </div>
      <div className="hero-visual">
        <img src={content.heroImage} alt="Architectural lighting in a contemporary Cyprus interior" />
        <div className="hero-shade"/>
        <RemotionHero/>
        <div className="live-signal-marker" style={{left:`${content.heroObject.x}%`,top:`${content.heroObject.y}%`}}><span>Live circuit</span><i/></div>
        <div className="floating-label one"><Sparkles/> Lighting<br/><b>with intent</b></div>
        <div className="floating-label two"><CircuitBoard/> Systems<br/><b>in sync</b></div>
      </div>
      <a className="scroll-cue" href="#intro">Discover <ArrowDown/></a>
    </section>

    <section id="intro" className="intro-statement section">
      <div><span className="eyebrow">From distribution board to final fitting</span><h2>Electrical work planned clearly,<br/><em>installed properly.</em></h2></div>
      <div className="intro-aside"><p>Separate specialists for electrical installations, architectural lighting, appliances and smart-home systems—coordinated by one local team.</p><Link className="text-link" to="/about">Meet the team <ArrowUpRight/></Link></div>
    </section>

    <section className="discipline-grid section">
      <Link to="/electrical-installations" className="discipline-card dark"><PlugZap/><div><h3>Electrical installations</h3><p>Planning, wiring, distribution, testing and maintenance.</p></div><ArrowUpRight className="corner"/></Link>
      <Link to="/lighting" className="discipline-card image"><img src={publicAsset('assets/generated/material-light.webp')} alt="Warm architectural light across textured material"/><Lightbulb/><div><h3>Lighting</h3><p>Interior, exterior, decorative and professional lighting with dedicated catalogues.</p></div><ArrowUpRight className="corner"/></Link>
      <Link to="/appliances" className="discipline-card paper"><Refrigerator/><div><h3>Appliances</h3><p>Home and kitchen appliances selected with installation support.</p></div><ArrowUpRight className="corner"/></Link>
      <Link to="/electrical-installations#smart" className="discipline-card acid"><CircuitBoard/><div><h3>Smart systems</h3><p>KNX control, security, sound and vision designed around the property.</p></div><ArrowUpRight className="corner"/></Link>
    </section>

    <section className="season-section section">
      <div className="season-heading"><span className="eyebrow">Product selection</span><h2>Choose by room,<br/><em>season and purpose.</em></h2><p>Filter lighting and appliances by where they will be used and what the space needs.</p><Link className="button outline" to="/explore">Open the product guide <ArrowUpRight/></Link></div>
      <div className="season-cards">
        <Link to="/explore?season=Summer" className="season-card summer" style={{backgroundImage:`url(${publicAsset('assets/generated/season-summer.webp')})`}}><small>Summer selection</small><h3>Outdoor lighting<br/>and cooling.</h3><span>Exterior fittings · ceiling fans · efficient cooking</span></Link>
        <Link to="/explore?season=Christmas" className="season-card christmas" style={{backgroundImage:`url(${publicAsset('assets/generated/season-christmas.webp')})`}}><small>Christmas selection</small><h3>Dining light<br/>and kitchen equipment.</h3><span>Pendant lights · coffee equipment · food preparation</span></Link>
        <Link to="/explore?season=Winter" className="season-card winter" style={{backgroundImage:`url(${publicAsset('assets/generated/season-winter.webp')})`}}><small>Winter selection</small><h3>Layered lighting<br/>and hot drinks.</h3><span>Interior lighting · coffee equipment · air comfort</span></Link>
      </div>
    </section>

    <section className="proof section">
      <div className="proof-number"><b>40</b><span>years of<br/>electrical experience</span></div>
      <div className="proof-number"><b>50+</b><span>projects<br/>each year</span></div>
      <div className="proof-number"><b>4</b><span>connected<br/>specialist services</span></div>
      <div className="proof-line"><span style={{width:'92%'}}/><p>From private homes to stores, restaurants and public spaces.</p></div>
    </section>
  </>;
}
